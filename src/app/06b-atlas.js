/* 06b-atlas.js: World and region maps ("the atlas"): painted-atlas terrain drawn from a small saved recipe, the World tab's
   places pinned on it, and the player version for the TV. Design: docs/superpowers/specs/2026-11-17-world-region-maps-design.md */

/* ======================= Terrain =======================
   A map's recipe is { seed, shape, land }. Terrain is never stored: atlasTerrain rebuilds it, the same every time.
   The grid is 400 × 275 cells; drawings are 1600 × 1100 (4 px a cell). */
const ATLAS_W = 1600, ATLAS_H = 1100, ATLAS_GW = 400, ATLAS_GH = 275;
const ATLAS_SHAPES = { coast: "Coast", inland: "Inland", island: "Island", archipelago: "Archipelago", peninsula: "Peninsula", volcano: "Volcano island", twin: "Twin lands" };
const ATLAS_LANDS = { balanced: "Balanced", mountains: "Mountains", forest: "Forest", plains: "Plains" };
/* climates (2026-11-24): a missing climate is temperate, so older maps keep their look */
const ATLAS_CLIMATES = { temperate: "Temperate", desert: "Desert", jungle: "Jungle", tundra: "Frozen north", swamp: "Swamp" };
const atlasClimate = m => ATLAS_CLIMATES[m.climate] ? m.climate : "temperate";
/* a map's recipe as a cache key. Version 2 maps (made from 2026-11-24) also get lakes in their hollows; a missing v is 1. */
const atlasKey = m => `${m.seed}|${m.shape}|${m.land}${atlasClimate(m) !== "temperate" ? "|" + atlasClimate(m) : ""}${(m.v || 1) >= 2 ? "|2" : ""}`;
const ATLAS_SEA_EDGE = new Set(["island", "archipelago", "volcano", "twin"]);
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
  const key = atlasKey(m), clim = atlasClimate(m), v2 = (m.v || 1) >= 2;
  if (ATLAS_T.has(key)) { const t = ATLAS_T.get(key); ATLAS_T.delete(key); ATLAS_T.set(key, t); return t; }
  const W = ATLAS_GW, H = ATLAS_GH, N = W * H, n = atlasNoise(m.seed), q = atlasNoise(m.seed + "|wet"), r = makeRng("atlas-shape", m.seed);
  const h = new Float32Array(N), wet = new Float32Array(N), shape = ATLAS_SHAPES[m.shape] ? m.shape : "coast", land = ATLAS_LANDS[m.land] ? m.land : "balanced";
  const sides = r.shuffle(["n", "s", "e", "w"]).slice(0, r.chance(.5) ? 1 : 2);
  const base = shape === "peninsula" ? r.pick(["n", "s", "e", "w"]) : null; // the side a peninsula grows from
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; let v = (n(x, y, 5, 1 / 70) - .5) * 1.9 + .25;
    if (shape === "island") { const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2); v -= .95 * (dx * dx + dy * dy) - .05; }
    if (shape === "archipelago") { const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2); v = (n(x, y, 5, 1 / 30) - .5) * 2.4 + .02 - .7 * Math.max(0, dx * dx + dy * dy - .3); }
    if (shape === "volcano") { const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2), d = Math.hypot(dx, dy), cone = Math.max(0, 1 - d / .42); v = v * .6 - 1.1 * (dx * dx + dy * dy) + .12 + cone * cone * 1.05; }
    if (shape === "twin") { const dy = (y - H / 2) / (H * .46), a = (x - W * .26) / (W * .3), b = (x - W * .74) / (W * .3); v -= .95 * Math.min(a * a + dy * dy, b * b + dy * dy) - .12; v -= Math.max(0, 1 - Math.abs(x - W / 2) / (W * .07)) * .9; }
    if (shape === "peninsula") {
      const t = { s: 1 - y / H, n: y / H, w: x / W, e: 1 - x / W }[base], u = (base === "n" || base === "s" ? (x - W / 2) / (W / 2) : (y - H / 2) / (H / 2)) + (n(x * .5 + 91, y * .5, 2, 1 / 60) - .5) * .5;
      const wide = .6 - .36 * t; if (Math.abs(u) > wide) v -= (Math.abs(u) - wide) * 2.6 + .06; if (t > .86) v -= (t - .86) * 6;
    }
    if (shape === "coast") for (const s of sides) { const d = { n: y / H, s: 1 - y / H, w: x / W, e: 1 - x / W }[s]; if (d < .45) v -= Math.pow((.45 - d) / .45, 1.6) * 1.05; }
    if (shape === "inland") v = .04 + Math.max(0, v + .06) * .72;
    if (land === "mountains" && v > 0) v = v * 1.3 + .06;
    if (land === "plains" && v > 0) v *= .62;
    h[i] = v; wet[i] = q(x, y, 3, 1 / 45) + (land === "forest" ? .14 : land === "plains" ? -.05 : 0) + { temperate: 0, desert: -.4, jungle: .22, tundra: -.06, swamp: .18 }[clim];
  }
  if (shape === "peninsula") for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = { n: H - 1 - y, s: y, w: W - 1 - x, e: x }[base]; if (Math.min(x, y, W - 1 - x, H - 1 - y) < 3 && e < 3) h[y * W + x] = Math.min(h[y * W + x], -.08); }
  if (ATLAS_SEA_EDGE.has(shape) && shape !== "island") for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.min(x, y, W - 1 - x, H - 1 - y) < 3) h[y * W + x] = Math.min(h[y * W + x], -.08);
  if (shape === "island") for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.min(x, y, W - 1 - x, H - 1 - y) < 3) h[y * W + x] = Math.min(h[y * W + x], -.08);
  const lakeCells = [], lakes = [];
  const lake = (cx, cy, rad) => { let k = 0; for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) { if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue; const d = (x - cx) ** 2 + (y - cy) ** 2 * 1.3; if (d > rad * rad || h[y * W + x] < 0) continue; h[y * W + x] = -.03 - .02 * (1 - d / (rad * rad)); lakeCells.push(y * W + x); k++; } if (k) lakes.push({ x: cx, y: cy, size: k }); };
  // inland: a few lakes in the lowest hollows
  if (shape === "inland") { const low = []; for (let y = 8; y < H - 8; y += 6) for (let x = 8; x < W - 8; x += 6) low.push([h[y * W + x], x, y]); low.sort((a, b) => a[0] - b[0]); low.slice(0, 2 + r.int(0, 2)).forEach(([, x, y]) => lake(x, y, 3 + r.int(0, 3))); }
  // newer maps: lakes in the hollows away from the sea, and a swamp's pools (own random streams)
  if (v2 && shape !== "inland") {
    const rl = makeRng("atlas-lakes", m.seed), dry = (x, y) => { for (let a = 0; a < 16; a++) { const px = Math.round(x + 14 * Math.cos(a * .3927)), py = Math.round(y + 14 * Math.sin(a * .3927)); if (px < 0 || py < 0 || px >= W || py >= H || h[py * W + px] < 0) return false; } return true; };
    const low = []; for (let y = 16; y < H - 16; y += 5) for (let x = 16; x < W - 16; x += 5) { const v = h[y * W + x]; if (v > .03 && v < .22 && dry(x, y)) low.push([v + rl.f() * .04, x, y]); }
    low.sort((a, b) => a[0] - b[0]); const took = [];
    for (const [, x, y] of low) { if (took.length >= 1 + rl.int(0, 2)) break; if (took.some(([a, b]) => Math.hypot(a - x, b - y) < 40)) continue; took.push([x, y]); lake(x, y, 3 + rl.int(0, 2)); }
  }
  if (clim === "swamp") { const mq = atlasNoise(m.seed + "|marsh"); for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { const i = y * W + x; if (h[i] > 0 && h[i] < .13 && mq(x, y, 3, 1 / 12) > .63) { h[i] = -.015; lakeCells.push(i); } } }
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
  const T = { W, H, h, wet, rivers, lakes, lakeCells, shape, land, climate: clim };
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
      const st = [i], cells = []; done[i] = 1; let n = 0, sx = 0, sy = 0;
      while (st.length) { const c = st.pop(), cx = c % gw, cy = Math.floor(c / gw); n++; sx += cx; sy += cy; cells.push(c);
        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + ax, ny = cy + ay, j = ny * gw + nx; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh || done[j] || !test(nx * S, ny * S)) continue; done[j] = 1; st.push(j); } }
      if (!best || n > best.n) { // label it on its own cell nearest the middle (the middle of a curved sea can be land)
        const mx = sx / n, my = sy / n; let bc = cells[0], bd = Infinity; for (const c of cells) { const d = (c % gw - mx) ** 2 + (Math.floor(c / gw) - my) ** 2; if (d < bd) { bd = d; bc = c; } }
        best = { n, x: (bc % gw) * S, y: Math.floor(bc / gw) * S };
      }
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
/* each climate's colours (2026-11-24): water by depth and land by height, as [height, [r, g, b]] stops, plus its inks */
const ATLAS_PAL = {
  temperate: { water: [[-.4, [30, 66, 108]], [-.08, [52, 102, 150]], [0, [96, 150, 188]]], land: [[0, [176, 196, 124]], [.08, [140, 184, 104]], [.22, [178, 188, 118]], [.38, [156, 138, 104]], [.52, [206, 200, 192]], [.62, [244, 244, 244]]], river: "#3f7fc6", ink: "#1f3550", peak: "#8a7556", tree: ["#2f5a2c", "#3f6f3a"], snow: .5 },
  desert: { water: [[-.4, [28, 70, 110]], [-.08, [44, 110, 150]], [0, [96, 172, 192]]], land: [[0, [238, 216, 162]], [.08, [228, 198, 142]], [.22, [216, 178, 120]], [.38, [186, 140, 94]], [.52, [154, 108, 76]], [.62, [134, 94, 68]]], river: "#3f8fc0", ink: "#5a3a1a", peak: "#a8774c", tree: ["#4f6f2c", "#6f9a3a"], snow: 9 },
  jungle: { water: [[-.4, [20, 70, 90]], [-.08, [34, 104, 120]], [0, [72, 152, 150]]], land: [[0, [124, 172, 92]], [.08, [72, 138, 66]], [.22, [88, 142, 72]], [.38, [112, 122, 82]], [.52, [152, 152, 132]], [.62, [232, 232, 228]]], river: "#3a8a9a", ink: "#1f3a30", peak: "#6f6a50", tree: ["#1f4a22", "#2f6a2c"], snow: .56 },
  tundra: { water: [[-.4, [40, 70, 100]], [-.08, [70, 110, 140]], [0, [132, 172, 198]]], land: [[0, [200, 206, 198]], [.08, [212, 218, 214]], [.22, [198, 206, 206]], [.38, [172, 174, 178]], [.52, [234, 238, 242]], [.62, [252, 252, 254]]], river: "#7fa6c8", ink: "#24384c", peak: "#8a8c92", tree: ["#2c4a3a", "#3d5e4a"], snow: .3 },
  swamp: { water: [[-.4, [40, 64, 64]], [-.08, [58, 88, 84]], [0, [86, 116, 102]]], land: [[0, [124, 136, 90]], [.08, [110, 128, 82]], [.22, [128, 136, 90]], [.38, [122, 112, 86]], [.52, [172, 168, 152]], [.62, [232, 232, 228]]], river: "#4f7a70", ink: "#22302a", peak: "#7a705a", tree: ["#334a2a", "#4b6b3a"], snow: .58 }
};
function atlasRamp(stops, v) {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i], t = (v - a) / (b - a); return ca.map((c, k) => c + (cb[k] - c) * t); }
  return stops[stops.length - 1][1];
}
function atlasTerrainCanvas(m) {
  const key = atlasKey(m);
  if (ATLAS_IMG.has(key)) return ATLAS_IMG.get(key);
  const T = atlasTerrain(m), { W, H, h, wet } = T, sx = ATLAS_W / W, sy = ATLAS_H / H, r = makeRng("atlas-ink", m.seed), clim = T.climate, pal = ATLAS_PAL[clim];
  const cv = document.createElement("canvas"); cv.width = ATLAS_W; cv.height = ATLAS_H; const g = cv.getContext("2d");
  // colours by height (a smooth ramp per climate), light hill shading and a painterly mottle, drawn small then scaled up smoothly
  const img = new ImageData(W, H), mot = atlasNoise(m.seed + "|paint"), lush = clim === "temperate" || clim === "jungle" || clim === "swamp";
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, v = h[i], land = v >= 0, c = land ? atlasRamp(pal.land, v) : atlasRamp(pal.water, v);
    const sh = land && x > 0 && y > 0 ? Math.max(-26, Math.min(26, (v - h[i - W - 1]) * 520)) : 0, t = (mot(x, y, 3, 1 / 9) - .5) * (land ? 22 : 10);
    const wt = land && lush && v < .38 ? (wet[i] - .5) * 24 : 0;
    img.data[i * 4] = c[0] + sh + t - wt * .5; img.data[i * 4 + 1] = c[1] + sh + t + wt * .4; img.data[i * 4 + 2] = c[2] + sh + t * .7 - wt * .3; img.data[i * 4 + 3] = 255;
  }
  const small = document.createElement("canvas"); small.width = W; small.height = H; small.getContext("2d").putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(small, 0, 0, ATLAS_W, ATLAS_H);
  // the coastline: marching squares at sea level, so it's smooth; ripples of white offshore
  const line = (lvl, style, wd) => { g.strokeStyle = style; g.lineWidth = wd; g.beginPath();
    const at = (x, y) => h[Math.min(H - 1, y) * W + Math.min(W - 1, x)] - lvl, lerp = (a, b) => a / (a - b);
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
      const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1), pts = [];
      if ((a < 0) !== (b < 0)) pts.push([x + lerp(a, b), y]); if ((b < 0) !== (c < 0)) pts.push([x + 1, y + lerp(b, c)]);
      if ((d < 0) !== (c < 0)) pts.push([x + lerp(d, c), y + 1]); if ((a < 0) !== (d < 0)) pts.push([x, y + lerp(a, d)]);
      for (let k = 0; k + 1 < pts.length; k += 2) { g.moveTo((pts[k][0] + .5) * sx, (pts[k][1] + .5) * sy); g.lineTo((pts[k + 1][0] + .5) * sx, (pts[k + 1][1] + .5) * sy); }
    } g.stroke(); };
  line(-.09, "rgba(255,255,255,.1)", 1); line(-.05, "rgba(255,255,255,.18)", 1.3); line(-.022, "rgba(255,255,255,.32)", 1.6);
  if (clim === "tundra") line(-.012, "rgba(255,255,255,.6)", 4); // ice along the shore
  line(0, pal.ink, 2.2);
  // rivers, wider downstream
  g.strokeStyle = pal.river; g.lineCap = "round"; g.lineJoin = "round";
  T.rivers.forEach(p => { for (let i = 1; i < p.length; i++) { g.lineWidth = 1.2 + 3.2 * i / p.length; g.beginPath(); g.moveTo((p[i - 1][0] + .5) * sx, (p[i - 1][1] + .5) * sy); g.lineTo((p[i][0] + .5) * sx, (p[i][1] + .5) * sy); g.stroke(); } });
  // marks, back to front: peaks (snow-capped when high), hills, and each climate's plants
  const marks = [], wd = atlasWaterDist(T);
  for (let y = 2; y < H - 2; y += 3) for (let x = 2; x < W - 2; x += 3) {
    const jx = x + (r.f() - .5) * 2.4, jy = y + (r.f() - .5) * 2.4, i = Math.round(jy) * W + Math.round(jx), v = h[i], w = wet[i], roll = r.f();
    if (v < .02) continue;
    if (v > .4) { if (x % 6 === 2 && y % 6 === 2 && roll < .7) marks.push([jy, "m", jx, v]); continue; }
    if (v > .3) { if (x % 6 === 5 && y % 6 === 2 && roll < .45) marks.push([jy, "h", jx, v]); continue; }
    if (clim === "temperate" && v > .03 && w > .55 && roll < .7) marks.push([jy, "f", jx, v]);
    else if (clim === "jungle" && w > .42 && roll < .85) marks.push([jy, "j", jx, v]);
    else if (clim === "tundra" && w > .48 && roll < .6) marks.push([jy, "p", jx, v]);
    else if (clim === "desert") { if (wd[i] < 4 && roll < .55) marks.push([jy, "palm", jx, v]); else if (v < .26 && roll < .16) marks.push([jy, "dune", jx, v]); }
    else if (clim === "swamp") { if (v < .16 && w > .45 && roll < .5) marks.push([jy, "reed", jx, v]); else if (w > .58 && roll < .5) marks.push([jy, "f", jx, v]); }
  }
  marks.sort((a, b) => a[0] - b[0]).forEach(([y, k, x, v]) => {
    const px = (x + .5) * sx, py = (y + .5) * sy, [dark, mid] = pal.tree;
    if (k === "f" || k === "j") { const R = k === "j" ? 6 : 5; g.fillStyle = dark; g.fillRect(px - .8, py + 2, 1.6, 4); g.fillStyle = k === "j" ? dark : mid; g.beginPath(); g.arc(px, py, R, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,.12)"; g.beginPath(); g.arc(px - 1.5, py - 1.5, 2, 0, 7); g.fill(); return; }
    if (k === "p") { g.fillStyle = dark; g.beginPath(); g.moveTo(px, py - 8); g.lineTo(px + 4.5, py + 4); g.lineTo(px - 4.5, py + 4); g.closePath(); g.fill(); g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(px - 2.5, py - 2, 5, 1.2); return; }
    if (k === "palm") { g.strokeStyle = "#6b4a2b"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(px, py + 5); g.quadraticCurveTo(px + 1.5, py, px, py - 4); g.stroke(); g.strokeStyle = mid; g.lineWidth = 1.8; g.beginPath(); for (let a = 0; a < 5; a++) { const an = -Math.PI / 2 + (a - 2) * .7; g.moveTo(px, py - 4); g.quadraticCurveTo(px + Math.cos(an) * 4, py - 4 + Math.sin(an) * 4 - 1, px + Math.cos(an) * 7, py - 4 + Math.sin(an) * 6 + 2); } g.stroke(); return; }
    if (k === "dune") { g.strokeStyle = "rgba(130,90,50,.55)"; g.lineWidth = 1.3; g.beginPath(); g.arc(px, py + 6, 8, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); return; }
    if (k === "reed") { g.strokeStyle = dark; g.lineWidth = 1; g.beginPath(); for (const d of [-3, 0, 3]) { g.moveTo(px + d, py + 4); g.lineTo(px + d * 1.4, py - 4 + Math.abs(d) * .5); } g.stroke(); return; }
    if (k === "h") { g.strokeStyle = "rgba(70,55,40,.55)"; g.lineWidth = 1.4; g.beginPath(); g.arc(px, py + 5, 9, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(px + 8, py + 7, 6, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); return; }
    const s = 11 + v * 18; g.fillStyle = pal.peak; g.strokeStyle = "#4a4038"; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(px - s, py + s * .55); g.lineTo(px, py - s * .75); g.lineTo(px + s, py + s * .55); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.moveTo(px, py - s * .75); g.lineTo(px + s, py + s * .55); g.lineTo(px + s * .2, py + s * .55); g.closePath(); g.fill();
    if (v > pal.snow) { g.fillStyle = "#f4f4f4"; g.beginPath(); g.moveTo(px - s * .36, py - s * .12); g.lineTo(px, py - s * .75); g.lineTo(px + s * .36, py - s * .12); g.lineTo(px + s * .1, py - s * .22); g.lineTo(px - s * .1, py - s * .05); g.closePath(); g.fill(); }
  });
  // a volcano's crater: a dark ring with a glow of lava
  if (T.shape === "volcano") { const cx = (W / 2 + .5) * sx, cy = (H / 2 + .5) * sy, gl = g.createRadialGradient(cx, cy, 4, cx, cy, 46); gl.addColorStop(0, "rgba(255,170,60,.95)"); gl.addColorStop(.35, "rgba(220,70,30,.6)"); gl.addColorStop(1, "rgba(120,30,10,0)");
    g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, 46, 0, 7); g.fill(); g.strokeStyle = "#3a2a22"; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 20, 0, 7); g.stroke(); g.fillStyle = "rgba(60,40,30,.5)"; g.beginPath(); g.arc(cx, cy, 18, 0, 7); g.fill(); g.fillStyle = "#ff9a3c"; g.beginPath(); g.arc(cx, cy, 9, 0, 7); g.fill(); }
  // old paper: grain, darker edges and a ruled frame
  g.fillStyle = "rgba(60,40,20,.06)"; for (let i = 0; i < 9000; i++) g.fillRect(r.f() * ATLAS_W, r.f() * ATLAS_H, 1.5, 1.5);
  const vg = g.createRadialGradient(ATLAS_W / 2, ATLAS_H / 2, ATLAS_H * .45, ATLAS_W / 2, ATLAS_H / 2, ATLAS_W * .62); vg.addColorStop(0, "rgba(60,40,20,0)"); vg.addColorStop(1, "rgba(60,40,20,.32)"); g.fillStyle = vg; g.fillRect(0, 0, ATLAS_W, ATLAS_H);
  g.strokeStyle = pal.ink; g.globalAlpha = .75; g.lineWidth = 3; g.strokeRect(9, 9, ATLAS_W - 18, ATLAS_H - 18); g.lineWidth = 1; g.strokeRect(16, 16, ATLAS_W - 32, ATLAS_H - 32); g.globalAlpha = 1;
  mapCompassRose(g, ATLAS_W - 84, ATLAS_H - 96, 50, pal.ink);
  ATLAS_IMG.set(key, cv); if (ATLAS_IMG.size > 4) ATLAS_IMG.delete(ATLAS_IMG.keys().next().value);
  return cv;
}
/* ======================= Borders and roads (2026-11-24) =======================
   Drawn on generated land from the pins being shown: regions inside the map (areas) split the land into territories with
   borders, and roads join the cities, towns and villages (a sea lane where there's no way over land). The players' version
   only gets the pins of places they've found, so it never shows a border or road to a place they haven't found. */
const ATLAS_TOWN = new Set(["city", "town", "village"]);
const ATLAS_REALM = [[178, 60, 60], [56, 92, 176], [56, 140, 78], [178, 124, 40], [124, 70, 156], [40, 140, 150]];
const ATLAS_LINES = new Map(); // what was worked out for a recipe and its pins (at most 8)
function atlasRoute(T, a, b) {
  const { W, H, h } = T, S = 2, gw = Math.ceil(W / S), gh = Math.ceil(H / S);
  if (!T.riverSet) { T.riverSet = new Uint8Array(W * H); T.rivers.forEach(p => p.forEach(([x, y]) => { T.riverSet[y * W + x] = 1; })); }
  const hc = (cx, cy) => h[Math.min(H - 1, cy * S) * W + Math.min(W - 1, cx * S)], cost = (cx, cy) => { const v = hc(cx, cy); if (v < 0) return Infinity; return 1 + Math.max(0, v - .28) * 30 + (T.riverSet[Math.min(H - 1, cy * S) * W + Math.min(W - 1, cx * S)] ? 4 : 0); };
  const sx = Math.min(gw - 1, Math.floor(a[0] / S)), sy = Math.min(gh - 1, Math.floor(a[1] / S)), tx = Math.min(gw - 1, Math.floor(b[0] / S)), ty = Math.min(gh - 1, Math.floor(b[1] / S));
  const N = gw * gh, g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), shut = new Uint8Array(N), heap = [], est = i => Math.hypot(i % gw - tx, Math.floor(i / gw) - ty);
  const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k) { const u = (k - 1) >> 1; if (heap[u][0] <= heap[k][0]) break; [heap[u], heap[k]] = [heap[k], heap[u]]; k = u; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, rr = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const s0 = sy * gw + sx, t0 = ty * gw + tx; g[s0] = 0; push(s0, est(s0));
  while (heap.length) {
    const [, i] = pop(); if (shut[i]) continue; shut[i] = 1; if (i === t0) break;
    const x = i % gw, y = (i - x) / gw;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      const j = ny * gw + nx, c = (j === t0 ? 1 : cost(nx, ny)) * (dx && dy ? 1.414 : 1); if (c === Infinity || shut[j]) continue;
      if (g[i] + c < g[j]) { g[j] = g[i] + c; from[j] = i; push(j, g[j] + est(j)); }
    }
  }
  if (!shut[t0]) return null;
  const path = []; for (let i = t0; i >= 0; i = from[i]) path.push([(i % gw) * S + S / 2, Math.floor(i / gw) * S + S / 2]);
  path.reverse(); path[0] = a; path[path.length - 1] = b;
  let pts = path.filter((q, k) => k === 0 || k === path.length - 1 || k % 2 === 0); // then round the corners (Chaikin)
  for (let k = 0; k < 2; k++) { const o = [pts[0]]; for (let i = 0; i + 1 < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; o.push([x0 * .75 + x1 * .25, y0 * .75 + y1 * .25], [x0 * .25 + x1 * .75, y0 * .25 + y1 * .75]); } o.push(pts[pts.length - 1]); pts = o; }
  return pts;
}
function atlasLines(m, pins) {
  const areas = pins.filter(q => q.area), towns = pins.filter(q => !q.area && ATLAS_TOWN.has(q.type));
  const key = atlasKey(m) + "|" + areas.map(q => `${q.id}@${q.x},${q.y}`).join(";") + "|" + towns.map(q => `${q.id}@${q.x},${q.y}`).join(";");
  if (ATLAS_LINES.has(key)) return ATLAS_LINES.get(key);
  const T = atlasTerrain(m), { W, H, h } = T, out = { own: null, roads: [], lanes: [] };
  if (areas.length >= 2) {
    const n = atlasNoise(m.seed + "|realm"), own = new Int8Array(W * H).fill(-1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (h[y * W + x] < 0) continue; let best = -1, bd = Infinity;
      areas.forEach((q, k) => { const d = Math.hypot(x - q.x * W, y - q.y * H) * (1 + (n(x + k * 57, y, 3, 1 / 40) - .5) * .6); if (d < bd) { bd = d; best = k; } });
      own[y * W + x] = best;
    }
    out.own = own;
  }
  if (towns.length >= 2) {
    const pts = towns.map(q => [q.x * W, q.y * H]), inn = [0], left = new Set(pts.map((_, i) => i).slice(1));
    while (left.size) { // the shortest links that join every town (a spanning tree)
      let best = null; inn.forEach(i => left.forEach(j => { const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); if (!best || d < best[2]) best = [i, j, d]; }));
      inn.push(best[1]); left.delete(best[1]);
      const road = atlasRoute(T, pts[best[0]], pts[best[1]]); if (road) out.roads.push(road); else out.lanes.push([pts[best[0]], pts[best[1]]]);
    }
  }
  ATLAS_LINES.set(key, out); if (ATLAS_LINES.size > 8) ATLAS_LINES.delete(ATLAS_LINES.keys().next().value);
  return out;
}
function atlasDrawLines(g, m, pins, w, hh) {
  const L = atlasLines(m, pins), T = atlasTerrain(m), { W, H } = T, sx = w / W, sy = hh / H;
  if (L.own) {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const cg = c.getContext("2d"), img = cg.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { const k = L.own[i]; if (k < 0) continue; const col = ATLAS_REALM[k % ATLAS_REALM.length]; img.data[i * 4] = col[0]; img.data[i * 4 + 1] = col[1]; img.data[i * 4 + 2] = col[2]; img.data[i * 4 + 3] = 46; }
    cg.putImageData(img, 0, 0); g.save(); g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, w, hh); g.restore();
    const seg = new Path2D();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = L.own[y * W + x]; if (k < 0) continue;
      if (x + 1 < W && L.own[y * W + x + 1] >= 0 && L.own[y * W + x + 1] !== k) { seg.moveTo((x + 1) * sx, y * sy); seg.lineTo((x + 1) * sx, (y + 1) * sy); }
      if (y + 1 < H && L.own[(y + 1) * W + x] >= 0 && L.own[(y + 1) * W + x] !== k) { seg.moveTo(x * sx, (y + 1) * sy); seg.lineTo((x + 1) * sx, (y + 1) * sy); }
    }
    g.save(); g.lineCap = "round"; g.strokeStyle = "rgba(255,245,230,.55)"; g.lineWidth = 5; g.stroke(seg); g.strokeStyle = "#7a2020"; g.lineWidth = 1.8; g.setLineDash([7, 5]); g.stroke(seg); g.restore();
  }
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  L.roads.forEach(p => { const path = new Path2D(); p.forEach(([x, y], i) => i ? path.lineTo(x * sx, y * sy) : path.moveTo(x * sx, y * sy)); g.setLineDash([]); g.strokeStyle = "rgba(250,240,215,.6)"; g.lineWidth = 5; g.stroke(path); g.setLineDash([10, 6]); g.strokeStyle = "#6b4a2b"; g.lineWidth = 2.2; g.stroke(path); });
  L.lanes.forEach(([a, b]) => { g.setLineDash([2, 8]); g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(a[0] * sx, a[1] * sy); g.lineTo(b[0] * sx, b[1] * sy); g.stroke(); });
  g.restore();
}
function atlasLabel(g, text, x, y, font, fill, halo = "rgba(0,0,0,.72)", spacing = 0) {
  g.font = font; if ("letterSpacing" in g) g.letterSpacing = spacing + "px";
  g.lineWidth = 5; g.lineJoin = "round"; g.strokeStyle = halo; g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y);
  if ("letterSpacing" in g) g.letterSpacing = "0px";
}
function atlasDraw(cv, m, o = {}) {
  // an imported picture keeps its own shape, with its long side at 1600; generated terrain is 1600 × 1100
  const k = o.scale || 1, base = o.picture || atlasTerrainCanvas(m), fit = o.picture ? ATLAS_W / Math.max(base.width, base.height) : 1;
  const w = o.picture ? Math.round(base.width * fit) : ATLAS_W, hh = o.picture ? Math.round(base.height * fit) : ATLAS_H;
  cv.width = Math.round(w * k); cv.height = Math.round(hh * k);
  const g = cv.getContext("2d"), labels = []; g.setTransform(k, 0, 0, k, 0, 0); g.drawImage(base, 0, 0, w, hh);
  g.textAlign = "center"; g.textBaseline = "middle";
  // lay out the names so they don't sit on pins or on each other: pins first, then feature names in the free space
  const pins = (o.pins || []).filter(p => !(o.player && p.hidden)), boxes = [], hit = b => boxes.some(c => b.x1 > c.x0 && b.x0 < c.x1 && b.y1 > c.y0 && b.y0 < c.y1);
  const width = (t, font, sp = 0) => { g.font = font; return g.measureText(t).width + sp * t.length; };
  const spots = pins.filter(q => !q.area).map(q => {
    const big = q.big, font = `${big ? "bold 30px" : "bold 24px"} Georgia, serif`, tw = width(q.name, font), x = q.x * w, y = q.y * hh, r = big ? 26 : 22;
    const left = x + r + 6 + tw > w - 8; // no room on the right: name on the left
    boxes.push({ x0: x - r, x1: x + r, y0: y - r, y1: y + r }, left ? { x0: x - r - 6 - tw, x1: x - r, y0: y - 18, y1: y + 18 } : { x0: x + r, x1: x + r + 6 + tw, y0: y - 18, y1: y + 18 });
    return { q, font, left, x, y, r };
  });
  if (!o.picture && m) atlasDrawLines(g, m, pins, w, hh); // borders and roads, under the names
  const areas = pins.filter(q => q.area).map(q => { const tw = width(q.name.toUpperCase(), "bold 34px Georgia, serif", 6), cx = Math.max(tw / 2 + 12, Math.min(w - tw / 2 - 12, q.x * w)), b = { x0: cx - tw / 2, x1: cx + tw / 2, y0: q.y * hh - 22, y1: q.y * hh + 22 }; boxes.push(b); return { ...q, cx }; }); // kept inside the map
  const TRY = [[0, 0], [0, -.045], [0, .045], [-.07, 0], [.07, 0], [0, -.09], [0, .09], [-.1, -.05], [.1, .05], [-.1, .05], [.1, -.05], [0, -.14], [0, .14]];
  (o.names || []).forEach(f => {
    const big = f.kind === "sea", it = f.kind === "river" || f.kind === "lake" || f.kind === "sea", font = `${it ? "italic " : ""}${big ? 34 : 26}px Georgia, serif`, sp = big ? 4 : 1, tw = width(f.name, font, sp);
    let at = null;
    for (const [dx, dy] of TRY) { const cx = (f.x + dx) * w, cy = (f.y + dy) * hh, b = { x0: cx - tw / 2 - 4, x1: cx + tw / 2 + 4, y0: cy - 18, y1: cy + 18 }; if (b.x0 < 6 || b.x1 > w - 6 || b.y0 < 60 || b.y1 > hh - 6) continue; if (!hit(b)) { at = [cx, cy, b]; break; } }
    if (!at) { const cx = Math.min(w - tw / 2 - 8, Math.max(tw / 2 + 8, f.x * w)), cy = f.y * hh; at = [cx, cy, { x0: cx - tw / 2, x1: cx + tw / 2, y0: cy - 18, y1: cy + 18 }]; }
    boxes.push(at[2]);
    atlasLabel(g, f.name, at[0], at[1], font, big ? "#d8ecff" : "#fff", "rgba(0,0,0,.6)", sp);
    labels.push(f.name);
  });
  // regions inside, as large spaced names; then pins
  areas.forEach(p => { g.globalAlpha = p.hidden ? .45 : .92; atlasLabel(g, p.name.toUpperCase(), p.cx, p.y * hh, "bold 34px Georgia, serif", "#fff8e6", "rgba(40,25,10,.55)", 6); g.globalAlpha = 1; labels.push(p.name); });
  spots.forEach(({ q: p, font, left, x, y, r }) => {
    g.globalAlpha = p.hidden ? .55 : 1;
    if (p.hidden) { g.setLineDash([6, 5]); g.strokeStyle = "#d0d0d0"; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.setLineDash([]); }
    else { g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.arc(x, y + 2, r - 5, 0, 7); g.fill(); }
    g.font = `${p.big ? 38 : 30}px serif`; g.fillStyle = "#000"; g.fillText(p.icon || "📍", x, y + 1);
    g.textAlign = left ? "right" : "left"; atlasLabel(g, p.name, left ? x - r - 2 : x + r + 2, y, font, p.hidden ? "#cfcfcf" : "#fff"); g.textAlign = "center";
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
  const m = { v: 2, seed: uid("at"), shape: ATLAS_SHAPES[o.shape] ? o.shape : "coast", land: ATLAS_LANDS[o.land] ? o.land : "balanced", climate: ATLAS_CLIMATES[o.climate] ? o.climate : "temperate", pins: {}, names: [] };
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
  const off = new Set(m.off || []); // places the DM took off this map
  for (const { p } of list) {
    if (m.pins[p.id] || off.has(p.id)) continue;
    const r = makeRng("pin", m.seed + "|" + p.id); let best = null, bs = -Infinity;
    for (let k = 0; k < 400; k++) {
      const q = { x: .05 + r.f() * .9, y: .06 + r.f() * .88 };
      let s = r.f() * .5;
      if (T) { const i = atlasCell(T, q); if (T.h[i] < .01) continue; s += atlasLikes(p.type, T, i); }
      const room = p.type === "region" ? .16 : .1; // a region's name is wide: keep it clear of pins
      for (const o of taken()) { const d = Math.hypot(o.x - q.x, (o.y - q.y) * ATLAS_H / ATLAS_W); if (d < room) s -= (room - d) * 400; }
      if (s > bs) { bs = s; best = q; }
    }
    if (best) m.pins[p.id] = T ? { x: +((Math.floor(best.x * T.W) + .5) / T.W).toFixed(5), y: +((Math.floor(best.y * T.H) + .5) / T.H).toFixed(5) } : { x: +best.x.toFixed(4), y: +best.y.toFixed(4) }; // the middle of the chosen cell, so rounding can't tip it into the sea
  }
  return m;
}
/* a new roll (or new shape / land): the DM's moved pins stay unless they'd be in the sea; the others are placed again */
function atlasReroll(id, o = {}) {
  const old = atlasOf(id); if (!old) return atlasMake(id, o);
  const m = { ...old, v: 2, seed: uid("at"), shape: ATLAS_SHAPES[o.shape] ? o.shape : old.shape, land: ATLAS_LANDS[o.land] ? o.land : old.land, climate: ATLAS_CLIMATES[o.climate] ? o.climate : atlasClimate(old), pins: {} };
  m.names = atlasNames(m);
  const T = atlasTerrain(m);
  Object.entries(old.pins).forEach(([k, q]) => { if (q.m) m.pins[k] = atlasToLand(T, q); });
  atlasSet(id, m); atlasPinsFill(id); return m;
}
/* the pins to draw: hidden ones are the places the players haven't found; the players' version leaves them out */
function atlasPins(id, player) {
  const m = atlasOf(id); if (!m) return [];
  return atlasPlaces(id).filter(({ p }) => m.pins[p.id] && (!player || p.found)).map(({ p, area }) => ({
    id: p.id, name: p.name || "Unnamed", icon: (WP_TYPES[p.type] || WP_TYPES.other)[0], x: m.pins[p.id].x, y: m.pins[p.id].y, hidden: !p.found, area, big: p.type === "city", type: p.type }));
}

/* ======================= The map view on the World tab =======================
   W.mode = "atlas" with W.atlasId (a region id or "world") shows atlasViewHTML() in #worldMain. On the canvas: press a pin
   and drag to move it; click a pin for its menu (#atlasMenu); click a region's name to open its map. */
const ATLAS_VIEW = { labels: [], drag: null, menu: null, pic: false };
function atlasName(id) { return id === "world" ? "The World" : (wp(id) || {}).name || "Region"; }
function atlasOpen(id) {
  if (!W.loaded) worldLoad();
  W.mode = "atlas"; W.atlasId = id; ATLAS_VIEW.menu = null;
  if (atlasOf(id)) { const before = JSON.stringify(atlasOf(id).pins); atlasPinsFill(id); if (JSON.stringify(atlasOf(id).pins) !== before) worldSave(); }
  renderWorld();
}
/* found by the players; revealing a place also reveals the regions it's in */
function atlasFound(p, on) {
  if (on) { let x = p, k = 0; while (x && k++ < 30) { x.found = true; x = wp(x.parent); } }
  else delete p.found;
  worldSave(); if (HOST.show === "atlas") hostSend();
}

/* ======================= On the TV =======================
   HOST.show = "atlas" with HOST.atlas = { id }. The TV's picture is drawn from the found places only, so a hidden place's
   name is never drawn on it. A click on the DM's map (not on a pin) pings the TV. */
const ATLAS_TV = { labels: [], pic: false };
function atlasTvLabels() { return ATLAS_TV.labels.slice(); }
function atlasTvCanvas() {
  const id = HOST.atlas && HOST.atlas.id, m = id && atlasOf(id); if (!m) return null;
  const picture = m.img ? ATLAS_PICS.get(m.img) || atlasBlank(m) : null, cv = document.createElement("canvas");
  const r = atlasDraw(cv, m, { player: true, picture, pins: atlasPins(id, true), names: m.img ? [] : (m.names || []).filter(f => f.name), title: atlasName(id) });
  ATLAS_TV.labels = r.labels; ATLAS_TV.pic = !!m.img && ATLAS_PICS.has(m.img);
  return cv;
}
const atlasOnTv = id => HOST.show === "atlas" && HOST.atlas && HOST.atlas.id === id;
function atlasTvSync(id) { if (atlasOnTv(id) && HOST.on) hostSend(); }
function atlasTv(id) {
  if (atlasOnTv(id)) { HOST.show = "map"; HOST.atlas = null; toast("The map is off the TV"); }
  else { HOST.atlas = { id }; HOST.show = "atlas"; if (!HOST.on) hostStart(); toast(`${atlasName(id)} is on the TV, showing only the places the players have found`); }
  handoutUI(); hostSend(); renderWorld();
}
function atlasViewHTML() {
  const id = W.atlasId, m = atlasOf(id), name = atlasName(id), sel = (attr, opts, v) => `<select ${attr}>${Object.entries(opts).map(([k, l]) => `<option value="${k}" ${k === v ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  const back = id === "world" ? "" : `<button class="btn sm" type="button" data-at="back" style="flex:0 0 auto">← ${esc(name)}</button>`;
  if (!m) return `<div class="card atlas-card"><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><h2 style="margin:0;flex:1">🗺️ ${esc(name)}</h2>${back}</div>
    <p class="muted">No map yet. Choose the kind of land and make one; you can roll again until you like it.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><div class="field" style="flex:0 1 160px"><label>Shape</label>${sel("data-at-shape", ATLAS_SHAPES, "coast")}</div>
      <div class="field" style="flex:0 1 160px"><label>Land</label>${sel("data-at-land", ATLAS_LANDS, "balanced")}</div><div class="field" style="flex:0 1 160px"><label>Climate</label>${sel("data-at-climate", ATLAS_CLIMATES, "temperate")}</div><button class="btn primary" type="button" data-at="make" style="flex:0 0 auto">🗺️ Make a map</button>
      <label class="btn" style="flex:0 0 auto">⬆ Or import your own map<input type="file" id="atlasFile" accept="image/*" hidden></label></div></div>`;
  const off = atlasPlaces(id).filter(x => !m.pins[x.p.id]);
  return `<div class="card atlas-card">
    <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><h2 style="margin:0;flex:1 1 200px">🗺️ ${esc(name)}</h2>${back}</div>
    <div id="atlasMissing" class="hint" hidden></div>
    <div class="row atlas-tools" style="gap:8px;flex-wrap:wrap;align-items:flex-end;margin:8px 0">
      ${m.img ? "" : `<div class="field" style="flex:0 1 140px"><label>Shape</label>${sel("data-at-shape", ATLAS_SHAPES, m.shape)}</div><div class="field" style="flex:0 1 140px"><label>Land</label>${sel("data-at-land", ATLAS_LANDS, m.land)}</div><div class="field" style="flex:0 1 140px"><label>Climate</label>${sel("data-at-climate", ATLAS_CLIMATES, atlasClimate(m))}</div>
      <button class="btn sm" type="button" data-at="roll" style="flex:0 0 auto">🎲 Roll again</button>`}
      <label class="btn sm" style="flex:0 0 auto" title="Use your own map picture (Inkarnate, Wonderdraft, a book scan) instead of the generated land">⬆ ${m.img ? "Replace the picture" : "Import a map"}<input type="file" id="atlasFile" accept="image/*" hidden></label>
      ${m.img ? `<button class="btn sm" type="button" data-at="gen" style="flex:0 0 auto">Use generated land</button>` : ""}
      <button class="btn sm primary" type="button" data-at="tv" style="flex:0 0 auto">${HOST.show === "atlas" && HOST.atlas && HOST.atlas.id === id ? "📺 Off TV" : "📺 Show on TV"}</button></div>
    <div class="atlas-wrap"><canvas id="atlasCv" aria-label="Map of ${esc(name)}"></canvas><div id="atlasMenu" class="atlas-menu" hidden></div></div>
    <p class="hint" style="margin:6px 0 0">Dashed pins are places the players haven't found; the TV leaves them out. Click a pin to reveal it or open it, drag it to move it${id === "world" ? ", and click a region's name to open its map" : ""}.</p>
    ${off.length ? `<p class="hint">Not on the map: ${off.map(x => `<button class="chip" type="button" data-at="unhide" data-id="${esc(x.p.id)}">${esc(x.p.name)} ＋</button>`).join(" ")}</p>` : ""}
    ${!m.img && (m.names || []).length ? `<div class="field" style="margin-top:10px"><label>Names on the map</label><div class="atlas-names">${m.names.map(f => `<label class="lbl" style="margin:0">${{ mountains: "⛰ Mountains", forest: "🌲 Forest", river: "〰 River", sea: "🌊 Sea", lake: "💧 Lake" }[f.kind] || f.kind}<input type="text" maxlength="60" data-atname="${esc(f.id)}" value="${esc(f.name)}" placeholder="(no name)"></label>`).join("")}</div></div>` : ""}
  </div>`;
}
function atlasRender() {
  const cv = $("#atlasCv"), id = W.atlasId, m = atlasOf(id); if (!cv || !m) return;
  ATLAS_VIEW.pic = false;
  const draw = picture => { if (!cv.isConnected) return; const r = atlasDraw(cv, m, { picture, pins: atlasPins(id, false), names: m.img ? [] : (m.names || []).filter(f => f.name), title: atlasName(id) }); ATLAS_VIEW.labels = r.labels; ATLAS_VIEW.pic = !!picture && !!m.img; atlasTvSync(id); };
  if (!m.img) return draw(null);
  const have = ATLAS_PICS.get(m.img); if (have) return draw(have);
  atlasPicture(m).then(pic => {
    if (W.atlasId !== id || !cv.isConnected) return;
    if (pic) return draw(pic);
    const miss = $("#atlasMissing"); if (miss) { miss.hidden = false; miss.textContent = "This map's picture is on another device (pictures stay on the computer they were imported on). Import it again here, or use generated land. The pins are kept."; }
    draw(atlasBlank(m));
  });
}

/* ======================= Import a map =======================
   m.img = "atlas-<id>": the DM's own picture in MAPIMG (this device; in backups, not account saves), used instead of terrain. */
const ATLAS_PICS = new Map(); // picture key -> canvas
async function atlasPicture(m) {
  if (!m || !m.img) return null; if (ATLAS_PICS.has(m.img)) return ATLAS_PICS.get(m.img);
  let blob = null; try { blob = await MAPIMG.get(m.img); } catch { } if (!blob) return null;
  try { const { cv } = await loadImageCanvas(blob); ATLAS_PICS.set(m.img, cv); return cv; } catch { return null; }
}
/* stand-in while a picture is missing: plain parchment the picture's shape, so the pins still show */
function atlasBlank(m) { const cv = document.createElement("canvas"); cv.width = m.imgW || ATLAS_W; cv.height = m.imgH || ATLAS_H; const g = cv.getContext("2d"); g.fillStyle = "#2a3550"; g.fillRect(0, 0, cv.width, cv.height); return cv; }
async function atlasImport(id, file) {
  let loaded; try { loaded = await loadImageCanvas(file); } catch { toast("Couldn't open that picture. Try a PNG, JPG or WebP."); return false; }
  const key = "atlas-" + id; try { await MAPIMG.put(key, await canvasBlob(loaded.cv)); } catch { toast("Couldn't keep the picture on this computer."); return false; }
  ATLAS_PICS.set(key, loaded.cv);
  const m = atlasOf(id) || atlasMake(id, {}); Object.assign(m, { img: key, imgW: loaded.cv.width, imgH: loaded.cv.height });
  atlasPinsFill(id); worldSave(); return true;
}
async function atlasUseGenerated(id) {
  const m = atlasOf(id); if (!m || !m.img) return;
  const key = m.img; delete m.img; delete m.imgW; delete m.imgH; ATLAS_PICS.delete(key);
  if (!(m.names || []).length) m.names = atlasNames(m);
  Object.keys(m.pins).forEach(k => { m.pins[k] = atlasToLand(atlasTerrain(m), m.pins[k]); });
  worldSave(); try { await MAPIMG.del(key); } catch { }
}
function atlasMenuShow(pin) {
  const menu = $("#atlasMenu"), cv = $("#atlasCv"); if (!menu || !cv) return;
  const p = wp(pin.id); if (!p) return; ATLAS_VIEW.menu = pin.id;
  const r = cv.getBoundingClientRect(), wr = menu.parentElement.getBoundingClientRect();
  menu.innerHTML = `<b>${esc(p.name)}</b><span class="muted">${(WP_TYPES[p.type] || WP_TYPES.other)[1]} · ${p.found ? "found by the players" : "not found yet"}</span>
    ${p.found ? `<button class="btn sm" type="button" data-atp="hide">🙈 Hide from the players</button>` : `<button class="btn sm primary" type="button" data-atp="reveal">👁 Reveal to the players</button>`}
    ${p.type === "region" ? `<button class="btn sm" type="button" data-atp="map">🗺️ Open its map</button>` : ""}
    <button class="btn sm" type="button" data-atp="open">Open the place</button><button class="btn sm" type="button" data-atp="remove">Take off the map</button>`;
  menu.hidden = false;
  const x = r.left - wr.left + pin.x * r.width, y = r.top - wr.top + pin.y * r.height;
  const mh = menu.offsetHeight, below = y + 14 + mh <= wr.height - 4; // open above the pin when there's no room below it
  menu.style.left = Math.max(4, Math.min(wr.width - 230, x + 14)) + "px"; menu.style.top = Math.max(4, below ? y + 14 : y - 14 - mh) + "px";
}
function atlasMenuHide() { const m = $("#atlasMenu"); if (m) m.hidden = true; ATLAS_VIEW.menu = null; }
function atlasHit(e) {
  const cv = $("#atlasCv"), r = cv.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
  // a place's pin wins over a region's name: names are big, pins are small
  const near = (list, reach) => { let best = null, bd = reach; list.forEach(q => { const d = Math.hypot((q.x - fx) * r.width, (q.y - fy) * r.height); if (d < bd) { bd = d; best = q; } }); return best; };
  const all = atlasPins(W.atlasId, false);
  return { pin: near(all.filter(q => !q.area), 26) || near(all.filter(q => q.area), 40), fx, fy };
}
(function initAtlas() {
  const view = $("#view-world"); if (!view) return;
  view.addEventListener("click", e => {
    const b = e.target.closest("[data-at],[data-atp]"); if (!b) return;
    const id = W.atlasId;
    if (b.dataset.atp) {
      const p = wp(ATLAS_VIEW.menu), k = b.dataset.atp; if (!p) return;
      if (k === "reveal" || k === "hide") { atlasFound(p, k === "reveal"); atlasMenuHide(); atlasRender(); toast(k === "reveal" ? `${p.name} is revealed to the players` : `${p.name} is hidden from the players`); }
      else if (k === "open") { W.sel = p.id; W.mode = "place"; renderWorld(); }
      else if (k === "map") atlasOpen(p.id);
      else if (k === "remove") { const m = atlasOf(id); delete m.pins[p.id]; m.off = [...new Set([...(m.off || []), p.id])]; worldSave(); renderWorld(); }
      return;
    }
    const a = b.dataset.at;
    if (a === "world") atlasOpen("world");
    else if (a === "open") atlasOpen(b.dataset.id || W.sel);
    else if (a === "back") { W.mode = "place"; W.sel = id; renderWorld(); }
    else if (a === "make") {
      const target = W.mode === "atlas" ? id : W.sel, shape = ($("[data-at-shape]") || {}).value, land = ($("[data-at-land]") || {}).value, climate = ($("[data-at-climate]") || {}).value;
      atlasMake(target, { shape, land, climate }); atlasPinsFill(target); worldSave(); atlasOpen(target);
    }
    else if (a === "roll") { atlasReroll(id, { shape: $("[data-at-shape]").value, land: $("[data-at-land]").value, climate: ($("[data-at-climate]") || {}).value }); worldSave(); renderWorld(); }
    else if (a === "tv") atlasTv(id);
    else if (a === "gen") { atlasUseGenerated(id).then(() => { renderWorld(); toast("Back to generated land"); }); }
    else if (a === "unhide") { const m = atlasOf(id); m.off = (m.off || []).filter(x => x !== b.dataset.id); atlasPinsFill(id); worldSave(); renderWorld(); }
  });
  view.addEventListener("change", async e => {
    const t = e.target;
    if (t.id === "atlasFile") {
      const f = t.files[0]; t.value = ""; if (!f) return;
      const id = W.mode === "atlas" ? W.atlasId : W.sel;
      if (await atlasImport(id, f)) { toast("Your map picture is in. Drag the pins to where the places are."); atlasOpen(id); }
      return;
    }
    if (t.dataset.atname) { const m = atlasOf(W.atlasId), f = m && m.names.find(x => x.id === t.dataset.atname); if (f) { f.name = t.value.trim().slice(0, 60); worldSave(); atlasRender(); } }
    else if (t.hasAttribute("data-wfound")) { const p = wp(W.sel); if (p) { atlasFound(p, t.checked); toast(t.checked ? `${p.name} is revealed to the players` : `${p.name} is hidden from the players`); } }
  });
  view.addEventListener("pointerdown", e => {
    if (e.target.id !== "atlasCv") return;
    const h = atlasHit(e); ATLAS_VIEW.drag = { pin: h.pin, x: e.clientX, y: e.clientY, moved: false };
    if (h.pin && !h.pin.area) e.target.setPointerCapture(e.pointerId);
  });
  view.addEventListener("pointermove", e => {
    const d = ATLAS_VIEW.drag; if (!d || !d.pin || d.pin.area || e.target.id !== "atlasCv") return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return;
    d.moved = true; atlasMenuHide();
    const r = e.target.getBoundingClientRect(), m = atlasOf(W.atlasId);
    m.pins[d.pin.id] = { x: +Math.min(.99, Math.max(.01, (e.clientX - r.left) / r.width)).toFixed(4), y: +Math.min(.99, Math.max(.01, (e.clientY - r.top) / r.height)).toFixed(4), m: 1 };
    atlasRender();
  });
  view.addEventListener("pointerup", e => {
    const d = ATLAS_VIEW.drag; ATLAS_VIEW.drag = null; if (!d || e.target.id !== "atlasCv") return;
    if (d.moved) { worldSave(); return; }
    if (!d.pin) { atlasMenuHide(); if (atlasOnTv(W.atlasId) && HOST.on) { const r = e.target.getBoundingClientRect(); hostPing((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); } return; }
    if (d.pin.area && W.atlasId === "world") { atlasOpen(d.pin.id); return; }
    atlasMenuShow(d.pin);
  });
})();
