/* 06b-atlas.js: World and region maps ("the atlas"): painted-atlas terrain drawn from a small saved recipe, the World tab's
   places pinned on it, and the player version for the TV. Design: docs/superpowers/specs/2026-11-17-world-region-maps-design.md */

/* ======================= Terrain =======================
   A map's recipe is { seed, shape, land }. Terrain is never stored: atlasTerrain rebuilds it, the same every time.
   The grid is 400 × 275 cells; drawings are 1600 × 1100 (4 px a cell). */
const ATLAS_W = 1600, ATLAS_H = 1100, ATLAS_GW = 400, ATLAS_GH = 275;
const ATLAS_SHAPES = { coast: "Coast", inland: "Inland", island: "Island" };
const ATLAS_LANDS = { balanced: "Balanced", mountains: "Mountains", forest: "Forest", plains: "Plains" };
const ATLAS_T = new Map(); // terrain cache, newest last (at most 6)
function atlasNoise(seed) {
  const r = makeRng("atlas", seed), P = new Uint16Array(512), G = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = r.f(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r.f() * (i + 1)); const t = P[i]; P[i] = P[j]; P[j] = t; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const s = t => t * t * (3 - 2 * t), v = (x, y) => G[P[P[x & 255] + (y & 255)]];
  const one = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = s(x - xi), w = s(y - yi), a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; };
  return (x, y, oct, fr) => { let t = 0, amp = 1, tot = 0; for (let o = 0; o < oct; o++) { t += amp * one(x * fr + o * 31.7, y * fr + o * 17.3); tot += amp; amp *= .5; fr *= 2; } return t / tot; };
}
function atlasTerrain(m) {
  const key = `${m.seed}|${m.shape}|${m.land}`;
  if (ATLAS_T.has(key)) { const t = ATLAS_T.get(key); ATLAS_T.delete(key); ATLAS_T.set(key, t); return t; }
  const W = ATLAS_GW, H = ATLAS_GH, N = W * H, n = atlasNoise(m.seed), q = atlasNoise(m.seed + "|wet"), r = makeRng("atlas-shape", m.seed);
  const h = new Float32Array(N), wet = new Float32Array(N), shape = ATLAS_SHAPES[m.shape] ? m.shape : "coast", land = ATLAS_LANDS[m.land] ? m.land : "balanced";
  const sides = r.shuffle(["n", "s", "e", "w"]).slice(0, r.chance(.5) ? 1 : 2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; let v = (n(x, y, 5, 1 / 70) - .5) * 1.9 + .28;
    if (shape === "island") { const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2); v -= .95 * (dx * dx + dy * dy) - .05; }
    if (shape === "coast") for (const s of sides) { const d = { n: y / H, s: 1 - y / H, w: x / W, e: 1 - x / W }[s]; if (d < .45) v -= Math.pow((.45 - d) / .45, 1.6) * 1.05; }
    if (shape === "inland") v = .04 + Math.max(0, v + .06) * .72;
    if (land === "mountains" && v > 0) v = v * 1.3 + .06;
    if (land === "plains" && v > 0) v *= .62;
    h[i] = v; wet[i] = q(x, y, 3, 1 / 45) + (land === "forest" ? .14 : land === "plains" ? -.05 : 0);
  }
  if (shape === "island") for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.min(x, y, W - 1 - x, H - 1 - y) < 3) h[y * W + x] = Math.min(h[y * W + x], -.08);
  const lakeCells = [], lakes = [];
  const lake = (cx, cy, rad) => { let k = 0; for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) { if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue; const d = (x - cx) ** 2 + (y - cy) ** 2 * 1.3; if (d > rad * rad || h[y * W + x] < 0) continue; h[y * W + x] = -.03 - .02 * (1 - d / (rad * rad)); lakeCells.push(y * W + x); k++; } if (k) lakes.push({ x: cx, y: cy, size: k }); };
  // inland: a few lakes in the lowest hollows
  if (shape === "inland") { const low = []; for (let y = 8; y < H - 8; y += 6) for (let x = 8; x < W - 8; x += 6) low.push([h[y * W + x], x, y]); low.sort((a, b) => a[0] - b[0]); low.slice(0, 2 + r.int(0, 2)).forEach(([, x, y]) => lake(x, y, 3 + r.int(0, 3))); }
  // rivers: downhill from high ground to the sea or a lake, joining when they meet
  const rivers = [], onRiver = new Int16Array(N).fill(-1), D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  for (let k = 0; k < 220 && rivers.length < 5; k++) {
    let x = r.int(4, W - 5), y = r.int(4, H - 5); if (h[y * W + x] < .34 || onRiver[y * W + x] >= 0) continue;
    const path = [[x, y]], seen = new Set([y * W + x]); let ok = false;
    for (let s = 0; s < 900; s++) {
      let bx = -1, by = -1, bh = Infinity;
      for (const [ax, ay] of D8) { const nx = x + ax, ny = y + ay; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(ny * W + nx)) continue; const v = h[ny * W + nx] + r.f() * .002; if (v < bh) { bh = v; bx = nx; by = ny; } }
      if (bx < 0) break;
      if (bh > h[y * W + x]) { if (path.length > 18 && h[y * W + x] > 0 && x > 4 && y > 4 && x < W - 5 && y < H - 5) { lake(x, y, 2 + r.int(1, 3)); ok = h[y * W + x] < 0; } break; } // a hollow: a lake ends the river (not at the map's edge)
      x = bx; y = by; seen.add(y * W + x); path.push([x, y]);
      if (h[y * W + x] < 0) { ok = true; break; }
      const j = onRiver[y * W + x]; if (j >= 0) { const o = rivers[j], at = o.findIndex(([ox, oy]) => ox === x && oy === y); path.push(...o.slice(at + 1)); ok = true; break; }
    }
    if (ok && path.length >= 25) { path.forEach(([px, py]) => { if (onRiver[py * W + px] < 0) onRiver[py * W + px] = rivers.length; }); rivers.push(path); }
  }
  const T = { W, H, h, wet, rivers, lakes, lakeCells, shape, land };
  T.feats = atlasFeats(T);
  ATLAS_T.set(key, T); if (ATLAS_T.size > 6) ATLAS_T.delete(ATLAS_T.keys().next().value);
  return T;
}
/* the biggest mountain area, forest, river and sea or lake, for naming: [{ kind, x, y, size }] in grid cells */
function atlasFeats(T) {
  const { W, H, h, wet } = T, S = 3, gw = Math.ceil(W / S), gh = Math.ceil(H / S), out = [];
  const biggest = test => {
    const done = new Uint8Array(gw * gh); let best = null;
    for (let i = 0; i < gw * gh; i++) {
      if (done[i] || !test((i % gw) * S, Math.floor(i / gw) * S)) continue;
      const st = [i]; done[i] = 1; let n = 0, sx = 0, sy = 0;
      while (st.length) { const c = st.pop(), cx = c % gw, cy = Math.floor(c / gw); n++; sx += cx; sy += cy;
        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + ax, ny = cy + ay, j = ny * gw + nx; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh || done[j] || !test(nx * S, ny * S)) continue; done[j] = 1; st.push(j); } }
      if (!best || n > best.n) best = { n, x: sx / n * S, y: sy / n * S };
    }
    return best;
  };
  const mt = biggest((x, y) => h[y * W + x] > .45); if (mt && mt.n >= 6) out.push({ kind: "mountains", x: mt.x, y: mt.y, size: mt.n });
  const fo = biggest((x, y) => { const v = h[y * W + x]; return v > .03 && v < .3 && wet[y * W + x] > .55; }); if (fo && fo.n >= 10) out.push({ kind: "forest", x: fo.x, y: fo.y, size: fo.n });
  const rv = T.rivers.slice().sort((a, b) => b.length - a.length)[0]; if (rv) { const [x, y] = rv[Math.floor(rv.length * .45)]; out.push({ kind: "river", x, y, size: rv.length }); }
  if (T.shape !== "inland") { const se = biggest((x, y) => h[y * W + x] < -.12); if (se && se.n >= 20) out.push({ kind: "sea", x: se.x, y: se.y, size: se.n }); }
  const lk = T.lakes.slice().sort((a, b) => b.size - a.size)[0]; if (lk) out.push({ kind: "lake", x: lk.x, y: lk.y, size: lk.size });
  return out;
}
const ATLAS_NA = ["Grey", "Iron", "Ash", "Storm", "Silver", "Raven", "Frost", "Amber", "Dusk", "Thorn", "Sun", "Moon", "Elder", "Wolf", "Bright", "Shadow", "Copper", "Mist", "Gold", "Red"];
const ATLAS_NB = ["Ashen", "Vel", "Morrow", "Kesh", "Dorn", "Elar", "Tamsin", "Brenn", "Oskar", "Lyr", "Hale", "Corrin", "Varra", "Isel", "Thane", "Wend"];
const ATLAS_NAME_T = {
  mountains: ["the {A}spine", "the {A} Peaks", "the {A}crown Mountains", "the Teeth of {B}"],
  forest: ["the {A}wood", "{A}leaf Forest", "the Forest of {B}", "the {A} Wilds"],
  river: ["River {B}", "the {A}water", "the {A}run", "River {A}flow"],
  sea: ["the {A} Bay", "the Sea of {B}", "the {A} Sound", "{B}'s Reach"],
  lake: ["Lake {B}", "the {A}mere", "{A} Lake", "the {A} Pool"],
};
function atlasNames(m) {
  const T = atlasTerrain(m), r = makeRng("atlas-names", m.seed);
  return T.feats.map((f, i) => ({ id: `f${i}`, kind: f.kind, name: r.pick(ATLAS_NAME_T[f.kind]).replace("{A}", r.pick(ATLAS_NA)).replace("{B}", r.pick(ATLAS_NB)), x: f.x / T.W, y: f.y / T.H }));
}

/* ======================= Drawing (the "Painted atlas" look) =======================
   atlasDraw(cv, m, o): o.pins = [{ name, icon, x, y, hidden, area }] (fractions), o.player leaves hidden pins out,
   o.names = feature labels, o.title, o.scale. Returns { labels }: every name drawn (the TV check reads it). */
const ATLAS_IMG = new Map(); // finished terrain pictures, by recipe (at most 4)
function atlasTerrainCanvas(m) {
  const key = `${m.seed}|${m.shape}|${m.land}`;
  if (ATLAS_IMG.has(key)) return ATLAS_IMG.get(key);
  const T = atlasTerrain(m), { W, H, h, wet } = T, sx = ATLAS_W / W, sy = ATLAS_H / H, r = makeRng("atlas-ink", m.seed);
  const cv = document.createElement("canvas"); cv.width = ATLAS_W; cv.height = ATLAS_H; const g = cv.getContext("2d");
  // colours by height, with light hill shading, drawn small then scaled up smoothly
  const img = new ImageData(W, H), col = v => v < -.06 ? [47, 95, 143] : v < 0 ? [79, 134, 184] : v < .18 ? [143, 191, 106] : v < .36 ? [185, 194, 122] : v < .5 ? [156, 139, 106] : [236, 236, 236];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, v = h[i], c = col(v), sh = v > 0 && x > 0 && y > 0 ? Math.max(-26, Math.min(26, (v - h[i - W - 1]) * 520)) : 0, dep = v < -.06 ? Math.max(-30, v * 40) : 0;
    img.data[i * 4] = c[0] + sh + dep; img.data[i * 4 + 1] = c[1] + sh + dep; img.data[i * 4 + 2] = c[2] + sh + dep * .4; img.data[i * 4 + 3] = 255;
  }
  const small = document.createElement("canvas"); small.width = W; small.height = H; small.getContext("2d").putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(small, 0, 0, ATLAS_W, ATLAS_H);
  // the coastline: marching squares at sea level, so it's smooth
  const line = (lvl, style, wd) => { g.strokeStyle = style; g.lineWidth = wd; g.beginPath();
    const at = (x, y) => h[Math.min(H - 1, y) * W + Math.min(W - 1, x)] - lvl, lerp = (a, b) => a / (a - b);
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
      const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1), pts = [];
      if ((a < 0) !== (b < 0)) pts.push([x + lerp(a, b), y]); if ((b < 0) !== (c < 0)) pts.push([x + 1, y + lerp(b, c)]);
      if ((d < 0) !== (c < 0)) pts.push([x + lerp(d, c), y + 1]); if ((a < 0) !== (d < 0)) pts.push([x, y + lerp(a, d)]);
      for (let k = 0; k + 1 < pts.length; k += 2) { g.moveTo((pts[k][0] + .5) * sx, (pts[k][1] + .5) * sy); g.lineTo((pts[k + 1][0] + .5) * sx, (pts[k + 1][1] + .5) * sy); }
    } g.stroke(); };
  line(-.05, "rgba(255,255,255,.18)", 3); line(0, "#1f3550", 2.2);
  // rivers, wider downstream
  g.strokeStyle = "#3f7fc6"; g.lineCap = "round"; g.lineJoin = "round";
  T.rivers.forEach(p => { for (let i = 1; i < p.length; i++) { g.lineWidth = 1.2 + 3.2 * i / p.length; g.beginPath(); g.moveTo((p[i - 1][0] + .5) * sx, (p[i - 1][1] + .5) * sy); g.lineTo((p[i][0] + .5) * sx, (p[i][1] + .5) * sy); g.stroke(); } });
  // forests (tree dots) and mountains (peaks, snow-capped when high), back to front
  const marks = [];
  for (let y = 2; y < H - 2; y += 3) for (let x = 2; x < W - 2; x += 3) {
    const jx = x + (r.f() - .5) * 2.4, jy = y + (r.f() - .5) * 2.4, i = Math.round(jy) * W + Math.round(jx), v = h[i];
    if (v > .36 && x % 6 === 2 && y % 6 === 2 && r.chance(.8)) marks.push([jy, "m", jx, v]); else if (v > .03 && v < .3 && wet[i] > .55 && r.chance(.7)) marks.push([jy, "f", jx, v]);
  }
  marks.sort((a, b) => a[0] - b[0]).forEach(([y, k, x, v]) => {
    const px = (x + .5) * sx, py = (y + .5) * sy;
    if (k === "f") { g.fillStyle = "#2f5a2c"; g.fillRect(px - .8, py + 2, 1.6, 4); g.fillStyle = "#3f6f3a"; g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,.12)"; g.beginPath(); g.arc(px - 1.5, py - 1.5, 2, 0, 7); g.fill(); return; }
    const s = 11 + v * 18; g.fillStyle = "#8a7556"; g.strokeStyle = "#4a4038"; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(px - s, py + s * .55); g.lineTo(px, py - s * .75); g.lineTo(px + s, py + s * .55); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.moveTo(px, py - s * .75); g.lineTo(px + s, py + s * .55); g.lineTo(px + s * .2, py + s * .55); g.closePath(); g.fill();
    if (v > .5) { g.fillStyle = "#f4f4f4"; g.beginPath(); g.moveTo(px - s * .36, py - s * .12); g.lineTo(px, py - s * .75); g.lineTo(px + s * .36, py - s * .12); g.lineTo(px + s * .1, py - s * .22); g.lineTo(px - s * .1, py - s * .05); g.closePath(); g.fill(); }
  });
  // compass
  const cx = ATLAS_W - 70, cy = ATLAS_H - 80; g.fillStyle = "rgba(255,255,255,.9)"; g.strokeStyle = "#1f3550"; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(cx, cy - 40); g.lineTo(cx + 12, cy); g.lineTo(cx, cy + 40); g.lineTo(cx - 12, cy); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#1f3550"; g.beginPath(); g.moveTo(cx, cy - 40); g.lineTo(cx + 12, cy); g.lineTo(cx - 12, cy); g.closePath(); g.fill();
  g.font = "bold 22px Georgia, serif"; g.textAlign = "center"; g.lineWidth = 4; g.strokeStyle = "rgba(0,0,0,.6)"; g.strokeText("N", cx, cy - 50); g.fillStyle = "#fff"; g.fillText("N", cx, cy - 50);
  ATLAS_IMG.set(key, cv); if (ATLAS_IMG.size > 4) ATLAS_IMG.delete(ATLAS_IMG.keys().next().value);
  return cv;
}
function atlasLabel(g, text, x, y, font, fill, halo = "rgba(0,0,0,.72)", spacing = 0) {
  g.font = font; if ("letterSpacing" in g) g.letterSpacing = spacing + "px";
  g.lineWidth = 5; g.lineJoin = "round"; g.strokeStyle = halo; g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y);
  if ("letterSpacing" in g) g.letterSpacing = "0px";
}
function atlasDraw(cv, m, o = {}) {
  const k = o.scale || 1, base = atlasTerrainCanvas(m), w = ATLAS_W, hh = ATLAS_H;
  cv.width = Math.round(w * k); cv.height = Math.round(hh * k);
  const g = cv.getContext("2d"), labels = []; g.setTransform(k, 0, 0, k, 0, 0); g.drawImage(base, 0, 0, w, hh);
  g.textAlign = "center"; g.textBaseline = "middle";
  // feature names
  (o.names || []).forEach(f => {
    const big = f.kind === "sea", it = f.kind === "river" || f.kind === "lake" || f.kind === "sea";
    atlasLabel(g, f.name, f.x * w, f.y * hh, `${it ? "italic " : ""}${big ? 34 : 26}px Georgia, serif`, big ? "#d8ecff" : "#fff", "rgba(0,0,0,.6)", big ? 4 : 1);
    labels.push(f.name);
  });
  // regions inside, as large spaced names; then pins
  const pins = (o.pins || []).filter(p => !(o.player && p.hidden));
  pins.filter(p => p.area).forEach(p => { g.globalAlpha = p.hidden ? .45 : .92; atlasLabel(g, p.name.toUpperCase(), p.x * w, p.y * hh, "bold 34px Georgia, serif", "#fff8e6", "rgba(40,25,10,.55)", 6); g.globalAlpha = 1; labels.push(p.name); });
  pins.filter(p => !p.area).forEach(p => {
    const x = p.x * w, y = p.y * hh, big = p.big;
    g.globalAlpha = p.hidden ? .55 : 1;
    if (p.hidden) { g.setLineDash([6, 5]); g.strokeStyle = "#d0d0d0"; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, big ? 26 : 22, 0, 7); g.stroke(); g.setLineDash([]); }
    else { g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.arc(x, y + 2, big ? 21 : 17, 0, 7); g.fill(); }
    g.font = `${big ? 38 : 30}px serif`; g.fillStyle = "#000"; g.fillText(p.icon || "📍", x, y + 1);
    g.textAlign = "left"; atlasLabel(g, p.name, x + (big ? 28 : 24), y, `${big ? "bold 30px" : "bold 24px"} Georgia, serif`, p.hidden ? "#cfcfcf" : "#fff"); g.textAlign = "center";
    g.globalAlpha = 1; labels.push(p.name);
  });
  if (o.title) { g.textAlign = "left"; atlasLabel(g, o.title, 34, 44, "italic bold 40px Georgia, serif", "#fff"); labels.push(o.title); }
  return { labels, w, h: hh };
}

/* ======================= Map data and pins =======================
   A region's map is p.atlas; the world map is W.atlas (saved with the places in the world doc). Both are
   { v: 1, seed, shape, land, pins: { placeId: { x, y, m? } }, names: [...], img?, imgW?, imgH? }: pins are fractions of the
   map, m marks a pin the DM moved. "Found by the players" is place.found (one campaign per world). */
const ATLAS_PIN = new Set(["city", "town", "village", "dungeon", "landmark", "wilderness", "other"]);
const ATLAS_STOP = new Set(["city", "town", "village", "dungeon"]); // what's inside these isn't on a terrain map
function atlasOf(id) { if (id === "world") return W.atlas || null; const p = wp(id); return p && p.type === "region" ? p.atlas || null : null; }
function atlasSet(id, m) { if (id === "world") W.atlas = m; else wp(id).atlas = m; return m; }
function atlasMake(id, o = {}) {
  const m = { v: 1, seed: uid("at"), shape: ATLAS_SHAPES[o.shape] ? o.shape : "coast", land: ATLAS_LANDS[o.land] ? o.land : "balanced", pins: {}, names: [] };
  m.names = atlasNames(m); return atlasSet(id, m);
}
/* what a map shows: [{ p, area }]. A region shows what's inside it, regions as areas; the world shows top-level ones. */
function atlasPlaces(id) {
  if (!W.loaded) worldLoad();
  const out = [], walk = pid => wpKids(pid).forEach(k => {
    if (k.type === "region") { out.push({ p: k, area: true }); walk(k.id); return; }
    if (ATLAS_PIN.has(k.type)) out.push({ p: k, area: false });
    if (!ATLAS_STOP.has(k.type)) walk(k.id);
  });
  if (id === "world") W.places.filter(x => !x.parent || !wp(x.parent)).forEach(x => { if (x.type === "region") out.push({ p: x, area: true }); else if (ATLAS_PIN.has(x.type)) out.push({ p: x, area: false }); });
  else walk(id);
  return out;
}
/* distance in cells to the nearest water (sea, lake or river), capped at 60 */
function atlasWaterDist(T) {
  if (T.wd) return T.wd;
  const { W, H, h } = T, d = new Uint8Array(W * H).fill(60), q = [];
  for (let i = 0; i < W * H; i++) if (h[i] < 0) { d[i] = 0; q.push(i); }
  T.rivers.forEach(r => r.forEach(([x, y]) => { const i = y * W + x; if (d[i]) { d[i] = 0; q.push(i); } }));
  for (let k = 0; k < q.length; k++) { const i = q[k], x = i % W, y = (i - x) / W; for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + ax, ny = y + ay; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); } } }
  return T.wd = d;
}
/* how much a place of this type likes a spot (higher is better) */
function atlasLikes(type, T, i) {
  const h = T.h[i], wd = atlasWaterDist(T)[i], wet = T.wet[i];
  switch (type) {
    case "city": return -wd * .9 - Math.abs(h - .1) * 6;
    case "town": return -wd * .6 - Math.abs(h - .14) * 5;
    case "village": return -wd * .35 - Math.abs(h - .12) * 4;
    case "dungeon": return h * 14 - Math.max(0, .55 - h) * 4;
    case "landmark": return -Math.abs(h - .32) * 10;
    case "wilderness": return (wet > .55 && h < .3 ? 6 : 0) + wet * 4;
    case "region": return -Math.abs(h - .2) * 3;
    default: return 0;
  }
}
const atlasCell = (T, q) => Math.min(T.H - 1, Math.max(0, Math.floor(q.y * T.H))) * T.W + Math.min(T.W - 1, Math.max(0, Math.floor(q.x * T.W)));
/* the nearest land to a spot, as fractions */
function atlasToLand(T, q) {
  if (T.h[atlasCell(T, q)] >= 0) return q;
  const cx = Math.floor(q.x * T.W), cy = Math.floor(q.y * T.H);
  for (let r = 1; r < Math.max(T.W, T.H); r++) for (let a = 0; a < 8 * r; a++) {
    const x = Math.round(cx + r * Math.cos(a / (8 * r) * Math.PI * 2)), y = Math.round(cy + r * Math.sin(a / (8 * r) * Math.PI * 2));
    if (x < 3 || y < 3 || x >= T.W - 3 || y >= T.H - 3) continue;
    if (T.h[y * T.W + x] >= .01) return { x: (x + .5) / T.W, y: (y + .5) / T.H, ...(q.m ? { m: 1 } : {}) };
  }
  return q;
}
/* every listed place without a pin gets a starting spot; pins of places no longer on this map go */
function atlasPinsFill(id) {
  const m = atlasOf(id); if (!m) return null;
  const list = atlasPlaces(id), want = new Set(list.map(x => x.p.id));
  Object.keys(m.pins).forEach(k => { if (!want.has(k)) delete m.pins[k]; });
  const T = m.img ? null : atlasTerrain(m), taken = () => Object.values(m.pins);
  for (const { p } of list) {
    if (m.pins[p.id]) continue;
    const r = makeRng("pin", m.seed + "|" + p.id); let best = null, bs = -Infinity;
    for (let k = 0; k < 400; k++) {
      const q = { x: .05 + r.f() * .9, y: .06 + r.f() * .88 };
      let s = r.f() * .5;
      if (T) { const i = atlasCell(T, q); if (T.h[i] < .01) continue; s += atlasLikes(p.type, T, i); }
      for (const o of taken()) { const d = Math.hypot(o.x - q.x, (o.y - q.y) * ATLAS_H / ATLAS_W); if (d < .07) s -= (.07 - d) * 400; }
      if (s > bs) { bs = s; best = q; }
    }
    if (best) m.pins[p.id] = { x: +best.x.toFixed(4), y: +best.y.toFixed(4) };
  }
  return m;
}
/* a new roll (or new shape / land): the DM's moved pins stay unless they'd be in the sea; the others are placed again */
function atlasReroll(id, o = {}) {
  const old = atlasOf(id); if (!old) return atlasMake(id, o);
  const m = { ...old, seed: o.keepSeed ? old.seed : uid("at"), shape: ATLAS_SHAPES[o.shape] ? o.shape : old.shape, land: ATLAS_LANDS[o.land] ? o.land : old.land, pins: {} };
  m.names = atlasNames(m);
  const T = atlasTerrain(m);
  Object.entries(old.pins).forEach(([k, q]) => { if (q.m) m.pins[k] = atlasToLand(T, q); });
  atlasSet(id, m); atlasPinsFill(id); return m;
}
/* the pins to draw: hidden ones are the places the players haven't found; the players' version leaves them out */
function atlasPins(id, player) {
  const m = atlasOf(id); if (!m) return [];
  return atlasPlaces(id).filter(({ p }) => m.pins[p.id] && (!player || p.found)).map(({ p, area }) => ({
    id: p.id, name: p.name || "Unnamed", icon: (WP_TYPES[p.type] || WP_TYPES.other)[0], x: m.pins[p.id].x, y: m.pins[p.id].y, hidden: !p.found, area, big: p.type === "city" }));
}
