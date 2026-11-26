/* 03e-map-modes.js: the Dungeon Map tab's three modes (2026-11-25, owner's pick of the layout mockups):
   Your maps (map-list: picture cards of every saved map), Build (map-build: the generator, editor and Room key) and
   Run (map-run: the map full screen with the Player Screen tools and Room key in tabs beside it).
   The same elements move between layouts by CSS class only (#view-map), so maps, fog, tokens and the TV work as before.
   Design: docs/superpowers/specs/2026-11-25-dungeon-map-layout-design.md. Check: npm run test:maplayout. */
const MAPMODE = { m: null, from: "build", rtab: "fog" };
/* every saved map: campaigns' maps and World places' maps */
function mapLibAll() {
  const out = [];
  for (const c of Store.list()) for (const m of c.maps || []) out.push({ m, from: "c:" + c.id, where: c.name, open: () => mapOpenSaved(m) });
  if (!W.loaded) worldLoad();
  for (const p of W.places) if (p.map) out.push({ m: p.map, from: "world", where: `World · ${p.name}`, open: () => wpMapOpen(p) });
  return out;
}
function mapKindText(m) { return m.kind === "image" ? "Map picture" : m.kind === "drawn" ? "Drawn map" : `${cap1(m.theme || "dungeon")} · ${m.rooms || "?"} rooms · level ${m.level || "?"}`; }
let mapLibUrls = [];
/* a small picture of a saved map, in box (the World tab's place maps use it too) */
async function mapThumbInto(box, m, isCurrent) {
  try {
    if (m.kind === "image") {
      let blob = null; try { blob = await MAPIMG.get(m.imgId); } catch { }
      if (!box.isConnected || (isCurrent && !isCurrent())) return null;
      if (!blob) { box.innerHTML = `<span class="muted">The picture isn't on this computer.</span>`; return null; }
      const url = URL.createObjectURL(blob), img = document.createElement("img"); img.src = url; img.alt = ""; box.replaceChildren(img); return url;
    }
    const cap = { small: 10, medium: 16, large: 24 }[m.size] || 16, d = m.kind === "drawn" ? drawnBuild(m) : generateDungeon({ ...m, rooms: Math.min(m.rooms || 10, cap) }), cv = document.createElement("canvas");
    drawDungeon(cv, d, true, { scale: 1 }); cv.setAttribute("aria-hidden", "true"); box.replaceChildren(cv);
  } catch (e) { box.innerHTML = `<span class="muted">Couldn't draw this map.</span>`; }
  return null;
}
function mapLibRender() {
  const sel = $("#mapLibFrom"), was = sel.value;
  sel.innerHTML = `<option value="">All your maps</option>` + Store.list().filter(c => (c.maps || []).length).map(c => `<option value="c:${esc(c.id)}">Campaign: ${esc(c.name)}</option>`).join("") + (W.places.some(p => p.map) ? `<option value="world">World places</option>` : "");
  sel.value = [...sel.options].some(o => o.value === was) ? was : "";
  const list = mapLibAll().filter(x => !sel.value || x.from === sel.value);
  MAPMODE.lib = list;
  mapLibUrls.forEach(u => URL.revokeObjectURL(u)); mapLibUrls = [];
  $("#mapLibGrid").innerHTML = list.map((x, i) => `<div class="card map-card"><div class="map-thumb" data-mapthumb="${i}"></div><h3>${esc(x.m.name || "Untitled map")}</h3>
      <p class="muted">${esc(mapKindText(x.m))}<br>${esc(x.where)}</p>
      <div class="row"><button class="btn sm" type="button" data-mapedit="${i}">✏ Edit</button><button class="btn sm primary" type="button" data-maprun="${i}">▶ Run</button></div></div>`).join("")
    + `<button type="button" class="card map-card map-card-new" id="mapLibNew2"><span aria-hidden="true">＋</span>Generate or draw a new map</button>`
    + (list.length ? "" : `<p class="muted map-lib-empty">No saved maps here yet. Make one, then use <b>Save to campaign</b> or <b>Save to a World place</b>.</p>`);
  list.forEach((x, i) => { const box = $(`[data-mapthumb="${i}"]`); mapThumbInto(box, x.m, () => MAPMODE.lib === list).then(u => { if (u) mapLibUrls.push(u); }); });
}
/* switch the tab's mode; Run remembers where it was opened from, for Done */
function mapMode(m) {
  const v = $("#view-map");
  if (m === "run" && !currentMap) renderMap();
  if (m === "run" && MED.on) medStop(); /* editing and running are separate: the editor's hidden tools must not stay live on the Run map */
  if (m === "run" && MAPMODE.m !== "run") MAPMODE.from = MAPMODE.m === "list" ? "list" : "build";
  MAPMODE.m = m;
  v.classList.toggle("map-list", m === "list"); v.classList.toggle("map-build", m === "build"); v.classList.toggle("map-run", m === "run");
  document.documentElement.classList.toggle("map-running", m === "run");
  if (m === "list") mapLibRender();
  if (m === "run") { $("#mapRunName").textContent = currentMap ? currentMap.params.name : ""; mapRunTab(MAPMODE.rtab); mapRunTv(); }
  if (m !== "list" && currentMap) requestAnimationFrame(() => { drawMapDM(); });
  /* the button pressed may now be hidden: move keyboard focus to the new screen */
  const a = document.activeElement;
  if (!a || a === document.body || (v.contains(a) && a.offsetParent === null)) { const f = $({ list: "#mapLibNew", build: "#mapToRun", run: "#mapRTabs [aria-selected=true]" }[m]); if (f) f.focus({ preventScroll: true }); }
}
function mapRunTab(t) {
  MAPMODE.rtab = t; $("#view-map").dataset.rtab = t;
  $$("#mapRTabs [data-rtab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.rtab === t)));
}
function mapRunTv() { const b = $("#mapRunTv"); if (b) { b.textContent = !HOST.on ? "TV not connected" : HOST.tv ? "📺 TV connected" : "Waiting for the TV window…"; b.classList.toggle("ok", !!(HOST.on && HOST.tv)); } }
/* opening a particular map (from a card, the Tracker or the World) shows it in Build, unless Run is open */
function mapShowBuild() { if (MAPMODE.m !== "run") mapMode("build"); }
/* arriving at the tab: Your maps when there are saved maps, otherwise Build; within a visit, the mode it was left in */
function mapEnter() {
  if (MAPMODE.m === null) mapMode(mapLibAll().length ? "list" : "build");
  else mapMode(MAPMODE.m === "run" ? "run" : MAPMODE.m);
}
function mapLeave() { if (MAPMODE.m === "run") mapMode(MAPMODE.from); }

$("#mapLibGrid").addEventListener("click", async e => {
  const ed = e.target.closest("[data-mapedit]"), run = e.target.closest("[data-maprun]");
  if (e.target.closest("#mapLibNew2")) { $("#mapLibNew").click(); return; }
  const x = MAPMODE.lib && MAPMODE.lib[(ed || run || {}).dataset?.mapedit ?? (run && run.dataset.maprun)];
  if (!x) return;
  mapMode("build"); await x.open(); if (run) { mapMode("run"); MAPMODE.from = "list"; } /* Done goes back to the list it came from */
});
$("#mapLibFrom").addEventListener("change", mapLibRender);
$("#mapLibNew").addEventListener("click", () => { mapMode("build"); $("#mapSeed").value = newSeed(); renderMap(); $("#mapName").focus(); });
$("#mapLibImport").addEventListener("click", () => { mapMode("build"); const f = $("#mapForm").querySelector('input[type=file]'); if (f) f.click(); });
$("#mapToList").addEventListener("click", () => mapMode("list"));
$("#mapToRun").addEventListener("click", () => mapMode("run"));
$("#mapRunDone").addEventListener("click", () => mapMode(MAPMODE.from));
$("#mapRTabs").addEventListener("click", e => { const b = e.target.closest("[data-rtab]"); if (b) mapRunTab(b.dataset.rtab); });
document.addEventListener("keydown", e => {
  if (e.key !== "Escape" || MAPMODE.m !== "run" || e.defaultPrevented || document.querySelector("#fightWin")) return; /* Esc closes the fight window first */
  /* a window open over Run (any of the app's pop-ups, What's new) gets the Esc instead */
  if (document.querySelector('dialog[open], #modal.open, [id$="Modal"].open, #sheetOverlay.open, #newsPanel:not([hidden])')) return;
  if (e.target.closest && e.target.closest("input, textarea, select")) return;
  mapMode(MAPMODE.from);
});
