/* ======================= Dungeon Map editor: the tools (2026-11-24) =======================
   #medPanel above the map: the tools (data-medtool), each tool's options (#medOpts), the selected thing (#medSel), Undo/Redo/Done,
   and 🎨 Style. While editing, the map's own pointer handlers (pan, hover, room places) are skipped; the editor is off while
   hosting for the TV (the mouse paints fog then). Every change goes through medChange, which keeps an undo copy of the record.
   The drawing in progress is kept in dmforge.mapdraft.v1 (in backups), so a refresh doesn't lose it. */
const MED = { on: false, tool: "room", undo: [], redo: [], drag: null, poly: [], cursor: null, sel: null, prop: "table", door: "door", stairs: "up", brush: 1, pic: null };
const MED_LS = "dmforge.mapdraft.v1";
const MED_TOOLS = [["select", "↖", "Select"], ["room", "▭", "Room"], ["round", "◯", "Round room"], ["shape", "⬠", "Shape"], ["paint", "🖌", "Paint"], ["erase", "⌫", "Erase"], ["erasebrush", "🧽", "Erase brush"],
  ["door", "🚪", "Door"], ["stairs", "🪜", "Stairs"], ["number", "#", "Room number"], ["text", "🔤", "Text"], ["prop", "🪑", "Furniture"], ["pic", "🖼", "Picture"]];
const MED_HINT = { select: "Click something to select it; drag to move it. Delete removes it.", room: "Drag to draw a room.", round: "Drag to draw a round room.", shape: "Click each corner; click the first corner (or double-click) to finish. Esc cancels.",
  paint: "Drag to paint floor, a square at a time.", erase: "Drag a box to cut it out of the floor.", erasebrush: "Drag to rub out floor.", door: "Click near the edge of a square to put a door there.", stairs: "Click a square for stairs.",
  number: "Click inside a room to give it a number and a Room Key entry.", text: "Click to add a label, then type it under Selected.", prop: "Pick a piece of furniture, then click the map.", pic: "Upload a picture, then click the map to place it." };

function medEl() { return $("#medPanel"); }
function medShowMap() {
  const d = currentMap; MAPUI.hover = null;
  $("#impPanel").hidden = true; hostLoad(d); drawMapDM(); if (HOST.on) hostSend(); medKey();
  $("#mapName").value = d.params.name; $("#mapStyle").value = d.params.style; $("#mapTheme").value = d.params.theme; $("#mapLevel").value = d.params.level; $("#mapParty").value = d.params.party;
}
function medKey() {
  const d = currentMap; if (!d || d.kind !== "drawn") return;
  $("#roomKey").innerHTML = d.rooms.length ? d.rooms.map((o, i) => `<div class="key-room"><span class="key-num">${+o.num}</span><b>${esc(o.type || "Room")}</b> <span class="muted">(${o.w * 5} × ${o.h * 5} ft)</span>${o.feature ? `<div>Features ${esc(o.feature)}.</div>` : ""}${(o.content || []).map(c => `<div>${esc(c)}</div>`).join("")}${o.enc ? encHTML(o.enc) + mapRunBtn(i) : ""}</div>`).join("")
    : `<p class="muted">No numbered rooms yet. Use <b>#</b> Room number to add Room Key entries.</p>`;
  fogKeyButtons();
}
function medKeyText(d) { return `${d.params.name}\n${"=".repeat(d.params.name.length)}\n` + d.rooms.map(o => `${o.num}. ${o.type || "Room"} (${o.w * 5}×${o.h * 5} ft)\n` + (o.feature ? `   Features ${o.feature}.\n` : "") + (o.content || []).map(c => "   " + c + "\n").join("") + (o.enc ? `   Encounter: ${o.enc.text} [${o.enc.rating}]\n` : "")).join("\n"); }
function medOpen(rec, msg) { mapShowBuild(); currentMap = drawnBuild(rec); HOST.key = null; location.hash = "map"; medShowMap(); if (msg) toast(msg); }
function medStart() {
  const d = currentMap; if (!d) { toast("Make or open a map first"); return; }
  if (HOST.on) { toast("Stop hosting for players to edit the map"); return; }
  if (d.kind === "image") { toast("Imported pictures can't be edited. Make a blank map or edit a generated one."); return; }
  if (d.kind !== "drawn") {
    const fogNow = HOST.key === fogKey(d.params) && HOST.fog ? { f: fogEncode(HOST.fog), s: [...HOST.found], k: HOST.tokens } : fogStoreRead()[fogKey(d.params)]; // keep the dungeon's fog and tokens
    currentMap = drawnBuild(drawnFromGen(d)); if (fogNow) fogStorePut(fogKey(currentMap.params), fogNow.f, fogNow.s || [], fogNow.k); HOST.key = null; medShowMap(); toast("This dungeon is now a drawn map you can change. Save it to a campaign to keep it."); }
  MED.on = true; MED.undo = []; MED.redo = []; MED.sel = null; MED.poly = []; medSaveDraft(); medUI(); drawMapDM();
}
function medNew() {
  if (HOST.on) { toast("Stop hosting for players to make a new map"); return; }
  const p = readMapForm(); medOpen(drawnBlank({ ...p, name: p.name === "The Forgotten Halls" ? "New map" : p.name }));
  MED.on = true; MED.undo = []; MED.redo = []; MED.sel = null; MED.poly = []; medSaveDraft(); medUI(); drawMapDM();
}
function medStop() { if (!MED.on) return; MED.on = false; MED.sel = null; MED.poly = []; MED.drag = null; medUI(); if (currentMap) drawMapDM(); }
/* the draft belongs to whoever is signed in to the account (or to the browser, with no account): Cloud.release deletes an
   account's draft on signing out, and a draft is only offered back to its owner */
const medOwner = () => { try { return (Cloud.on && Cloud.uid) || null; } catch { return null; } }; // Cloud (04-storage.js) loads after this file
function medSaveDraft() { const d = currentMap; if (d && d.kind === "drawn") try { localStorage.setItem(MED_LS, JSON.stringify({ owner: medOwner(), rec: drawnRecord(d) })); } catch { /* full: the campaign save still works */ } medResumeUI(); }
function medDraft() { try { const v = JSON.parse(localStorage.getItem(MED_LS) || "null"); return v && v.rec && (v.owner || null) === medOwner() ? v.rec : null; } catch { return null; } }
function medResumeUI() { const b = $("#medResume"); if (b) b.hidden = !medDraft() || (currentMap && currentMap.kind === "drawn"); }
function medChange(fn) {
  const d = currentMap; if (!d || d.kind !== "drawn") return;
  MED.undo.push(JSON.stringify(d.rec)); if (MED.undo.length > 80) MED.undo.shift(); MED.redo = [];
  fn(d.rec); medApply();
}
function medApply() {
  const d = currentMap; drawnRefresh(d); if (MED.sel && !medSelObj()) MED.sel = null;
  medSaveDraft(); medKey(); drawMapDM(); if (HOST.on) hostSend(); medSelUI();
}
function medUndo(back) {
  const d = currentMap, from = back ? MED.undo : MED.redo, to = back ? MED.redo : MED.undo; if (!d || !from.length) { toast(back ? "Nothing to undo" : "Nothing to redo"); return; }
  to.push(JSON.stringify(d.rec)); d.rec = JSON.parse(from.pop()); MED.poly = []; medApply();
}

/* the map form's settings on a drawn map: they change the drawing's name, look and party, never its layout */
function medFormChange(id) {
  if (id === "#mapGrid") { drawMapDM(); if (HOST.on) hostSend(); return; }
  if (id === "#mapSize" || id === "#mapRooms") { toast("A drawn map keeps its size and rooms. Press Generate Dungeon for a new dungeon."); return; }
  const p = readMapForm(), k = { "#mapTheme": "theme", "#mapStyle": "style", "#mapLevel": "level", "#mapParty": "party", "#mapName": "name" }[id]; if (!k) return;
  medChange(r => { r[k] = p[k]; }); medUI();
}
/* ---- the panel ---- */
function medUI() {
  const p = medEl(); if (!p) return; p.hidden = !MED.on;
  $("#mapToolsHint").hidden = MED.on; $("#mapCanvas").classList.toggle("editing", MED.on);
  if (!MED.on) return;
  p.querySelectorAll("[data-medtool]").forEach(b => { const on = b.dataset.medtool === MED.tool; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  $("#medHint").textContent = MED_HINT[MED.tool] || "";
  const o = $("#medOpts"), t = MED.tool;
  o.innerHTML = t === "door" ? `<label class="lbl">Kind <select data-medo="door">${[["door", "Door"], ["secret", "Secret door"], ["locked", "Locked door"], ["bars", "Bars (portcullis)"]].map(([v, l]) => `<option value="${v}" ${MED.door === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`
    : t === "stairs" ? `<label class="lbl">Going <select data-medo="stairs"><option value="up" ${MED.stairs === "up" ? "selected" : ""}>Up</option><option value="down" ${MED.stairs === "down" ? "selected" : ""}>Down</option></select></label>`
    : t === "paint" || t === "erasebrush" ? `<label class="lbl">Brush <select data-medo="brush">${[1, 2, 3].map(n => `<option value="${n}" ${MED.brush === n ? "selected" : ""}>${n} × ${n}</option>`).join("")}</select></label>`
    : t === "prop" ? `<div class="med-props">${Object.entries(MAP_PROPS).map(([k, [l]]) => `<button type="button" class="chip${MED.prop === k ? " on" : ""}" data-medprop="${k}" aria-pressed="${MED.prop === k}">${esc(l)}</button>`).join("")}</div>`
    : t === "pic" ? `<label class="btn sm" style="flex:0 0 auto">⬆ Upload a picture<input type="file" id="medPicFile" accept="image/*" hidden></label>${MED.pic ? ` <span class="muted">Ready: click the map to place it.</span>` : ""}`
    : t === "shape" && MED.poly.length ? `<span class="muted">${MED.poly.length} corner${MED.poly.length === 1 ? "" : "s"}</span> <button class="btn sm" type="button" data-meda="polydone">Finish shape</button>` : "";
  o.hidden = !o.innerHTML;
  const L = currentMap && currentMap.rec ? currentMap.rec.look || {} : {}, st = currentMap ? drawnStyle(currentMap, mapStyle(currentMap)) : null;
  if (st) { $("#medWall").value = st.ink.length === 7 ? st.ink : "#000000"; $("#medWallW").value = st.wallW; $("#medRough").value = String(st.rough); $("#medFloor").value = st.floorC.length === 7 ? st.floorC : "#ffffff"; $("#medGrid").value = st.gridMode; $("#medHatch").value = L.hatch || "auto"; }
  $("#medUndo").disabled = !MED.undo.length; $("#medRedo").disabled = !MED.redo.length;
  medSelUI();
}
function medSelObj() {
  const s = MED.sel, r = currentMap && currentMap.rec; if (!s || !r) return null;
  if (s.type === "prop") return r.props.find(o => o.id === s.id);
  if (s.type === "label") return r.labels.find(o => o.id === s.id);
  if (s.type === "door") return r.doors[s.i]; if (s.type === "icon") return r.icons[s.i]; if (s.type === "room") return r.rooms.find(o => o.num === s.num);
  return null;
}
function medSelUI() {
  const box = $("#medSel"); if (!box) return; const o = medSelObj(), s = MED.sel;
  if (!MED.on || !o) { box.hidden = true; box.innerHTML = ""; return; }
  const del = `<button class="btn sm" type="button" data-meda="del">🗑 Delete</button>`;
  box.innerHTML = s.type === "prop" ? `<b>${o.k === "img" ? "🖼 Picture" : "🪑 " + esc((MAP_PROPS[o.k] || [o.k])[0])}</b> <button class="btn sm" type="button" data-meda="turn">⟳ Turn</button><button class="btn sm" type="button" data-meda="bigger">＋ Bigger</button><button class="btn sm" type="button" data-meda="smaller">－ Smaller</button>${del}`
    : s.type === "label" ? `<label class="lbl">Text <input type="text" data-medf="text" maxlength="60" value="${esc(o.text)}"></label><label class="lbl">Size <select data-medf="size">${[12, 16, 22, 30, 40].map(n => `<option value="${n}" ${+o.size === n ? "selected" : ""}>${n}</option>`).join("")}</select></label><label class="check" style="margin:0"><input type="checkbox" data-medf="dm" ${o.dm ? "checked" : ""}><span>DM only (not on the TV)</span></label>${del}`
    : s.type === "door" ? `<b>🚪 Door</b> <label class="lbl">Kind <select data-medf="kind">${[["door", "Door"], ["secret", "Secret door"], ["locked", "Locked door"], ["bars", "Bars"]].map(([v, l]) => `<option value="${v}" ${o.kind === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>${del}`
    : s.type === "icon" ? `<b>🪜 Stairs</b> <label class="lbl">Going <select data-medf="m"><option value="up" ${o.m === "up" ? "selected" : ""}>Up</option><option value="down" ${o.m === "down" ? "selected" : ""}>Down</option></select></label>${del}`
    : `<b>Room ${+o.num}</b> <label class="lbl">Name <input type="text" data-medf="type" maxlength="60" value="${esc(o.type || "")}"></label><label class="lbl" style="flex:1 1 100%">Notes (one per line)<textarea data-medf="content" rows="2">${esc((o.content || []).join("\n"))}</textarea></label>${del}`;
  box.hidden = false;
}
function medSelDelete() {
  const s = MED.sel; if (!s || !medSelObj()) return;
  medChange(r => {
    if (s.type === "prop") r.props = r.props.filter(o => o.id !== s.id); else if (s.type === "label") r.labels = r.labels.filter(o => o.id !== s.id);
    else if (s.type === "door") r.doors.splice(s.i, 1); else if (s.type === "icon") r.icons.splice(s.i, 1);
    else if (s.type === "room") { r.rooms = r.rooms.filter(o => o.num !== s.num); r.rooms.forEach((o, i) => { o.num = i + 1; }); }
  });
  MED.sel = null; medSelUI();
}

/* ---- the pointer ---- */
function medPt(e) { const c = canvasCell(e), d = currentMap; if (!c) return null; const X = c.fx * d.W, Y = (c.fy * (d.H * CS + TOP) - TOP) / CS; return { X, Y, x: Math.floor(X), y: Math.floor(Y), in: X >= 0 && Y >= 0 && X < d.W && Y < d.H }; }
const medHalf = v => Math.round(v * 2) / 2;
function medBrushCells(p) { const n = MED.brush, o = Math.floor((n - 1) / 2), out = []; for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) { const x = p.x - o + dx, y = p.y - o + dy; if (x >= 0 && y >= 0 && x < currentMap.W && y < currentMap.H) out.push(x + "," + y); } return out; }
function medDoorAt(p) { // the square edge nearest the point: as {x, y, dx, dy}
  const fx = p.X - p.x, fy = p.Y - p.y, opts = [[fx, -1, 0], [1 - fx, 1, 0], [fy, 0, -1], [1 - fy, 0, 1]].sort((a, b) => a[0] - b[0]), [, dx, dy] = opts[0];
  return { x: p.x, y: p.y, dx, dy };
}
const medSameEdge = (a, b) => (a.x === b.x && a.y === b.y && a.dx === b.dx && a.dy === b.dy) || (a.x + a.dx === b.x && a.y + a.dy === b.y && a.dx === -b.dx && a.dy === -b.dy);
function medHit(p) {
  const r = currentMap.rec, d = currentMap;
  for (let i = r.labels.length - 1; i >= 0; i--) { const o = r.labels[i], w = Math.max(1, String(o.text).length * (+o.size || 16) * .32 / CS), h = (+o.size || 16) / CS * .6; if (Math.abs(p.X - o.x) <= w && Math.abs(p.Y - o.y) <= h) return { type: "label", id: o.id }; }
  const room = d.rooms.find(o => Math.hypot(p.X - o.cx - .5, p.Y - o.cy - .5) < .6); if (room) return { type: "room", num: room.num };
  const ic = r.icons.findIndex(o => o.x === p.x && o.y === p.y); if (ic >= 0) return { type: "icon", i: ic };
  const e = medDoorAt(p), di = r.doors.findIndex(o => medSameEdge(o, e)); if (di >= 0 && Math.min(p.X - p.x, 1 - (p.X - p.x), p.Y - p.y, 1 - (p.Y - p.y)) < .3) return { type: "door", i: di };
  for (let i = r.props.length - 1; i >= 0; i--) { const o = r.props[i]; if (p.X >= o.x && p.X < o.x + o.w && p.Y >= o.y && p.Y < o.y + o.h) return { type: "prop", id: o.id }; }
  return null;
}
function medDown(e) {
  const d = currentMap, p = medPt(e); if (!p) return; const t = MED.tool;
  if (t === "room" || t === "round" || t === "erase") { if (!p.in) return; MED.drag = { t, x0: medHalf(p.X), y0: medHalf(p.Y), x1: medHalf(p.X), y1: medHalf(p.Y) }; }
  else if (t === "paint" || t === "erasebrush") { if (!p.in) return; MED.drag = { t, cells: new Set(medBrushCells(p)) }; }
  else if (t === "shape") {
    if (!p.in) return; const q = [medHalf(p.X), medHalf(p.Y)];
    if (MED.poly.length >= 3 && Math.hypot(q[0] - MED.poly[0][0], q[1] - MED.poly[0][1]) < .6) { medPolyDone(); return; }
    MED.poly.push(q); medUI(); medOverlayRedraw(); return;
  } else if (t === "select") {
    const h = p.in ? medHit(p) : null; MED.sel = h; medSelUI();
    if (h && (h.type === "prop" || h.type === "label" || h.type === "icon" || h.type === "room")) { const o = medSelObj(), ox = h.type === "room" ? o.cx : o.x, oy = h.type === "room" ? o.cy : o.y; MED.drag = { t, ox: p.X - ox, oy: p.Y - oy, snap: JSON.stringify(d.rec), moved: false }; }
    medOverlayRedraw(); if (!MED.drag) return;
  } else {
    if (!p.in) return;
    if (t === "door") { const e2 = medDoorAt(p), i = d.rec.doors.findIndex(o => medSameEdge(o, e2)); if (i >= 0) { MED.sel = { type: "door", i }; medSelUI(); medOverlayRedraw(); return; } medChange(r => r.doors.push({ ...e2, kind: MED.door })); MED.sel = { type: "door", i: d.rec.doors.length - 1 }; }
    else if (t === "stairs") { const i = d.rec.icons.findIndex(o => o.x === p.x && o.y === p.y); if (i >= 0) { MED.sel = { type: "icon", i }; medSelUI(); medOverlayRedraw(); return; } medChange(r => r.icons.push({ m: MED.stairs, x: p.x, y: p.y })); MED.sel = { type: "icon", i: d.rec.icons.length - 1 }; }
    else if (t === "number") { const num = d.rooms.reduce((m, o) => Math.max(m, o.num), 0) + 1; medChange(r => r.rooms.push({ num, cx: p.x, cy: p.y, type: "Room", feature: "", content: [], marks: [], icons: [] })); MED.sel = { type: "room", num }; }
    else if (t === "text") { const id = uid("lb"); medChange(r => r.labels.push({ id, x: Math.round(p.X * 4) / 4, y: Math.round(p.Y * 4) / 4, text: "Label", size: 16, dm: false })); MED.sel = { type: "label", id }; medSelUI(); const f = $('#medSel [data-medf="text"]'); if (f) { f.focus(); f.select(); } }
    else if (t === "prop" || t === "pic") {
      if (t === "pic" && !MED.pic) { toast("Upload a picture first"); return; }
      const [, w, h] = t === "pic" ? [0, 2, 2] : MAP_PROPS[MED.prop] || ["", 1, 1], id = uid("pr");
      medChange(r => r.props.push({ id, k: t === "pic" ? "img" : MED.prop, ...(t === "pic" ? { img: MED.pic } : {}), x: clamp(p.x, 0, d.W - w), y: clamp(p.y, 0, d.H - h), w, h })); MED.sel = { type: "prop", id };
    }
    medSelUI(); medOverlayRedraw(); return;
  }
  e.target.setPointerCapture(e.pointerId); medOverlayRedraw();
}
function medMove(e) {
  const p = medPt(e); if (!p) return; MED.cursor = p; const g = MED.drag;
  if (!g) { if (MED.tool === "shape" && MED.poly.length) medOverlayRedraw(); return; }
  const d = currentMap;
  if (g.t === "room" || g.t === "round" || g.t === "erase") { g.x1 = clamp(medHalf(p.X), 0, d.W); g.y1 = clamp(medHalf(p.Y), 0, d.H); }
  else if (g.t === "paint" || g.t === "erasebrush") { if (p.in) medBrushCells(p).forEach(k => g.cells.add(k)); }
  else if (g.t === "select") {
    const o = medSelObj(); if (!o) return; const s = MED.sel;
    if (s.type === "label") { o.x = clamp(Math.round((p.X - g.ox) * 4) / 4, 0, d.W); o.y = clamp(Math.round((p.Y - g.oy) * 4) / 4, 0, d.H); }
    else if (s.type === "room") { o.cx = clamp(Math.round(p.X - g.ox), 0, d.W - 1); o.cy = clamp(Math.round(p.Y - g.oy), 0, d.H - 1); }
    else { const w = o.w || 1, h = o.h || 1; o.x = clamp(Math.round(p.X - g.ox), 0, d.W - w); o.y = clamp(Math.round(p.Y - g.oy), 0, d.H - h); }
    g.moved = true; d._base = null; drawMapDM(); return;
  }
  medOverlayRedraw();
}
function medUp() {
  const g = MED.drag; MED.drag = null; if (!g) return; const d = currentMap;
  if (g.t === "room" || g.t === "round" || g.t === "erase") {
    const x = Math.min(g.x0, g.x1), y = Math.min(g.y0, g.y1), w = Math.abs(g.x1 - g.x0), h = Math.abs(g.y1 - g.y0);
    if (w >= .5 && h >= .5) medChange(r => r.shapes.push({ op: g.t === "erase" ? "cut" : "add", t: g.t === "round" ? "ellipse" : "rect", x, y, w, h })); else medOverlayRedraw();
  } else if (g.t === "paint" || g.t === "erasebrush") {
    const c = [...g.cells].map(k => k.split(",").map(Number)); if (c.length) medChange(r => r.shapes.push({ op: g.t === "erasebrush" ? "cut" : "add", t: "cells", c }));
  } else if (g.t === "select" && g.moved) { MED.undo.push(g.snap); MED.redo = []; medApply(); }
}
function medPolyDone() {
  const pts = MED.poly; MED.poly = [];
  if (pts.length >= 3) medChange(r => r.shapes.push({ op: "add", t: "poly", pts })); else { medUI(); medOverlayRedraw(); }
}
/* previews and the selection, on the overlay canvas over the map */
function medOverlayRedraw() { if (typeof mapOverlayDraw === "function") mapOverlayDraw(); }
function medOverlay() {
  const ov = $("#mapOverlay"), cv = $("#mapCanvas"), d = currentMap; if (!d || !MED.on) return;
  const g = ov.getContext("2d"), k = cv.width / (d.W * CS); g.setTransform(k, 0, 0, k, 0, TOP * k); g.save();
  const gold = "#e8a33d", red = "#c0392b", G = MED.drag;
  if (G && (G.t === "room" || G.t === "round" || G.t === "erase")) {
    const x = Math.min(G.x0, G.x1) * CS, y = Math.min(G.y0, G.y1) * CS, w = Math.abs(G.x1 - G.x0) * CS, h = Math.abs(G.y1 - G.y0) * CS;
    g.setLineDash([6, 4]); g.lineWidth = 2; g.strokeStyle = G.t === "erase" ? red : gold; g.fillStyle = G.t === "erase" ? "rgba(192,57,43,.18)" : "rgba(232,163,61,.18)";
    g.beginPath(); if (G.t === "round") g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7); else g.rect(x, y, w, h); g.fill(); g.stroke();
  }
  if (G && (G.t === "paint" || G.t === "erasebrush")) { g.fillStyle = G.t === "erasebrush" ? "rgba(192,57,43,.35)" : "rgba(232,163,61,.35)"; G.cells.forEach(kk => { const [x, y] = kk.split(",").map(Number); g.fillRect(x * CS, y * CS, CS, CS); }); }
  if (MED.tool === "shape" && MED.poly.length) {
    g.strokeStyle = gold; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); MED.poly.forEach(([x, y], i) => i ? g.lineTo(x * CS, y * CS) : g.moveTo(x * CS, y * CS));
    if (MED.cursor) g.lineTo(medHalf(MED.cursor.X) * CS, medHalf(MED.cursor.Y) * CS); g.stroke(); g.setLineDash([]); g.fillStyle = gold; MED.poly.forEach(([x, y], i) => { g.beginPath(); g.arc(x * CS, y * CS, i ? 3 : 5, 0, 7); g.fill(); });
  }
  const o = medSelObj(), s = MED.sel;
  if (o) {
    g.setLineDash([5, 3]); g.lineWidth = 2; g.strokeStyle = gold; g.shadowColor = "rgba(232,163,61,.9)"; g.shadowBlur = 6;
    if (s.type === "prop") g.strokeRect(o.x * CS - 2, o.y * CS - 2, o.w * CS + 4, o.h * CS + 4);
    else if (s.type === "icon") g.strokeRect(o.x * CS - 2, o.y * CS - 2, CS + 4, CS + 4);
    else if (s.type === "room") { g.beginPath(); g.arc(o.cx * CS + CS / 2, o.cy * CS + CS / 2, 14, 0, 7); g.stroke(); }
    else if (s.type === "label") { const w = Math.max(CS, String(o.text).length * (+o.size || 16) * .62), h = (+o.size || 16) * 1.2; g.strokeRect(o.x * CS - w / 2, o.y * CS - h / 2, w, h); }
    else if (s.type === "door") { const b = mapDoorEdge(o); g.lineWidth = 5; g.beginPath(); g.moveTo(b[0].x * CS, b[0].y * CS); g.lineTo(b[1].x * CS, b[1].y * CS); g.stroke(); }
  }
  g.restore();
}

/* ---- wiring ---- */
(function initMed() {
  const p = medEl(); if (!p) return;
  $("#medTools").innerHTML = MED_TOOLS.map(([k, ic, l]) => `<button type="button" class="chip" data-medtool="${k}" aria-pressed="false" title="${l}"><span aria-hidden="true">${ic}</span> ${l}</button>`).join("");
  $("#medEdit").addEventListener("click", medStart); $("#medNew").addEventListener("click", medNew);
  $("#medResume").addEventListener("click", () => { const rec = medDraft(); if (!rec) { toast("No drawing to go back to"); medResumeUI(); return; } medOpen(rec, "Your last drawing is back."); medStart(); });
  setTimeout(medResumeUI, 0); // after start-up, once the account code has loaded
  p.addEventListener("click", e => {
    const tb = e.target.closest("[data-medtool]"); if (tb) { MED.tool = tb.dataset.medtool; if (MED.tool !== "shape") MED.poly = []; if (MED.tool !== "select") MED.sel = null; medUI(); medOverlayRedraw(); return; }
    const pb = e.target.closest("[data-medprop]"); if (pb) { MED.prop = pb.dataset.medprop; medUI(); return; }
    const a = e.target.closest("[data-meda]"); if (!a) return; const k = a.dataset.meda, o = medSelObj();
    if (k === "undo") medUndo(true); else if (k === "redo") medUndo(false); else if (k === "done") { medStop(); toast("Editing finished. Save the map to a campaign or World place to keep it."); }
    else if (k === "polydone") medPolyDone(); else if (k === "del") medSelDelete();
    else if (k === "stylereset") medChange(r => { r.look = {}; });
    else if (o && MED.sel.type === "prop") { const id = MED.sel.id, d = currentMap; medChange(r => { const q = r.props.find(x => x.id === id); if (!q) return;
      if (k === "turn") { [q.w, q.h] = [q.h, q.w]; } else if (k === "bigger") { q.w = Math.min(8, q.w + 1); q.h = Math.min(8, q.h + 1); } else if (k === "smaller") { q.w = Math.max(1, q.w - 1); q.h = Math.max(1, q.h - 1); }
      q.x = clamp(q.x, 0, d.W - q.w); q.y = clamp(q.y, 0, d.H - q.h); }); }
  });
  p.addEventListener("change", async e => {
    const t = e.target;
    if (t.dataset.medo) { MED[t.dataset.medo] = t.dataset.medo === "brush" ? +t.value : t.value; return; }
    if (t.id === "medPicFile") {
      const f = t.files[0]; t.value = ""; if (!f) return;
      let loaded; try { loaded = await loadImageCanvas(f); } catch { toast("Couldn't open that picture. Try a PNG, JPG or WebP."); return; }
      const key = "prop-" + uid("pic"); try { await MAPIMG.put(key, await canvasBlob(loaded.cv)); } catch { toast("Couldn't keep the picture on this computer."); return; }
      MED_PICS.set(key, loaded.cv); MED.pic = key; medUI(); toast("Picture ready: click the map to place it"); return;
    }
    if (t.dataset.medf) {
      const s = MED.sel, f = t.dataset.medf; if (!s || !medSelObj()) return;
      const v = t.type === "checkbox" ? t.checked : t.value;
      medChange(() => { const o = medSelObj(); if (!o) return; if (f === "content") o.content = String(v).split("\n").map(x => x.trim()).filter(Boolean).slice(0, 20); else if (f === "size") o.size = +v; else if (f === "text" || f === "type") o[f] = String(v).slice(0, 60); else o[f] = v; });
      return;
    }
    const look = { medWall: "wall", medWallW: "wallW", medRough: "rough", medFloor: "floor", medGrid: "grid", medHatch: "hatch" }[t.id];
    if (look) medChange(r => { r.look = r.look || {}; let v = t.value; if (look === "wallW" || look === "rough") v = +v; if (look === "hatch" && v === "auto") delete r.look.hatch; else r.look[look] = v; });
  });
  const cv = $("#mapCanvas"), on = () => MED.on && !HOST.on && currentMap && currentMap.kind === "drawn";
  cv.addEventListener("pointerdown", e => { if (!on() || e.button !== 0) return; e.stopImmediatePropagation(); e.preventDefault(); medDown(e); }, true);
  cv.addEventListener("pointermove", e => { if (!on()) return; e.stopImmediatePropagation(); medMove(e); }, true);
  cv.addEventListener("pointerup", e => { if (!on()) return; e.stopImmediatePropagation(); medUp(e); }, true);
  cv.addEventListener("pointercancel", e => { if (!on()) return; e.stopImmediatePropagation(); MED.drag = null; medOverlayRedraw(); }, true);
  cv.addEventListener("dblclick", e => { if (on() && MED.tool === "shape") { e.preventDefault(); if (MED.poly.length >= 3) medPolyDone(); } });
  document.addEventListener("keydown", e => {
    if (!on() || e.target.closest("input,textarea,select,[contenteditable]")) return;
    const z = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z", y = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y";
    if (z && !e.shiftKey) { e.preventDefault(); medUndo(true); } else if (y || (z && e.shiftKey)) { e.preventDefault(); medUndo(false); }
    else if ((e.key === "Delete" || e.key === "Backspace") && MED.sel) { e.preventDefault(); medSelDelete(); }
    else if (e.key === "Escape") { MED.poly = []; MED.drag = null; MED.sel = null; medUI(); medOverlayRedraw(); }
    else if (e.key === "Enter" && MED.tool === "shape" && MED.poly.length >= 3) { e.preventDefault(); medPolyDone(); }
  });
})();
