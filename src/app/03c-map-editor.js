/* ======================= Dungeon Map editor (2026-11-24) =======================
   Drawn maps: { kind: "drawn" } maps the DM edits by hand. ✏️ Edit map turns a generated dungeon into one (keeping its rooms,
   key, doors and furniture); New blank map starts an empty one. Design: docs/superpowers/specs/2026-11-24-map-editor-design.md.

   The saved record (d.rec, also what campaigns, World places and map files keep):
     { kind: "drawn", v: 1, id, name, theme, level, party, style, W, H,
       base: { g, r }      starting floor squares and their room ids (run-length text, mapRle),
       shapes: [{ op: "add"|"cut", t: "rect"|"ellipse"|"poly"|"cells", x, y, w, h | pts | c }]   in squares, applied in order,
       doors: [{ x, y, dx, dy, kind }]   kind: door | secret | locked | bars (the generated maps' door shape, plus kind),
       icons: [{ m: "up"|"down", x, y }] stairs,
       labels: [{ id, x, y, text, size, dm }], props: [{ id, k, x, y, w, h, img? }],
       rooms: [{ num, cx, cy, type, feature, content, marks, icons, enc? }]   the room key,
       look: { wall?, wallW?, rough?, floor?, grid?, hatch? } }
   The runtime map (currentMap) also has the generated maps' fields, worked out by drawnRefresh: W, H, grid (1 = floor: at
   least half the square is floor), rid (room ids), rooms, doors and params, so fog, tokens, Reveal room, hovering, the TV and
   Run this fight work unchanged. */
const MED_Q = 4; // floor samples per square, for the squares and the traced walls
const mapRle = arr => { let s = "", v = arr[0], n = 0; for (let i = 0; i <= arr.length; i++) { if (i < arr.length && arr[i] === v) { n++; continue; } if (n) s += v + ":" + n.toString(36) + ","; v = arr[i]; n = 1; } return s; };
const mapUnrle = (str, n) => { const out = new Int32Array(n); let i = 0; for (const run of String(str || "").split(",")) { if (!run) continue; const [v, c] = run.split(":"); const k = parseInt(c, 36) || 0; out.fill(+v || 0, i, Math.min(n, i + k)); i += k; } return out; };

/* the furniture library: key -> [label, width, height] in squares (the drawings are drawProp's, plus drawPropMore's) */
const MAP_PROPS = {
  table: ["Table", 1, 2], chair: ["Chair", 1, 1], bed: ["Bed", 1, 2], bookshelf: ["Bookshelf", 2, 1], rack: ["Weapon rack", 2, 1], chest: ["Chest", 1, 1], crate: ["Crate", 1, 1], barrel: ["Barrel", 1, 1],
  altar: ["Altar", 1, 1], statue: ["Statue", 1, 1], pillar: ["Pillar", 1, 1], sarcophagus: ["Coffin", 1, 2], throne: ["Throne", 1, 1], brazier: ["Brazier", 1, 1], campfire: ["Campfire", 1, 1],
  rug: ["Rug", 2, 3], pool: ["Pool", 2, 2], well: ["Well", 1, 1], pit: ["Pit", 1, 1], ladder: ["Ladder", 1, 1], cart: ["Cart", 1, 2], tent: ["Tent", 2, 2],
  tree: ["Tree", 1, 1], bush: ["Bush", 1, 1], rock: ["Boulder", 1, 1], rubble: ["Rubble", 1, 1], bones: ["Bones", 1, 1], web: ["Web", 1, 1], fungus: ["Mushrooms", 1, 1], crystal: ["Crystals", 1, 1]
};
const MAP_PROP_OLD = new Set(["pillar", "sarcophagus", "table", "bed", "bookshelf", "rack", "cart", "crate", "barrel", "altar", "statue", "brazier", "pool", "bones", "rubble", "fungus", "crystal", "web"]);
const MED_PICS = new Map(); // uploaded pictures for props: key -> canvas (null while loading)
function drawPropMore(g, p, st) {
  const X = p.x * CS, Y = p.y * CS, w = p.w * CS, h = p.h * CS, cx = X + w / 2, cy = Y + h / 2, ink = st.ink, dk = st.dark;
  g.save(); g.lineWidth = 1.2; g.strokeStyle = ink; g.lineJoin = "round"; g.lineCap = "round";
  const box = (x, y, bw, bh, f) => { g.fillStyle = f; g.fillRect(x, y, bw, bh); g.strokeRect(x, y, bw, bh); };
  const wood = st.propB || (dk ? "#6e5a3f" : "#c8a979"), pale = st.propA || (dk ? "#4b4238" : "#d9ccb0");
  switch (p.k) {
    case "chair": box(cx - 5, cy - 4, 10, 9, wood); g.beginPath(); g.moveTo(cx - 5, cy - 6); g.lineTo(cx + 5, cy - 6); g.stroke(); break;
    case "chest": box(X + 4, Y + 6, w - 8, h - 11, "#b8862e"); g.beginPath(); g.moveTo(X + 4, Y + 10); g.lineTo(X + w - 4, Y + 10); g.stroke(); g.fillStyle = ink; g.fillRect(cx - 1.5, Y + 9, 3, 3); break;
    case "throne": box(X + 3, Y + 6, w - 6, h - 8, "#9b2f2f"); box(X + 3, Y + 2, w - 6, 5, "#c9a227"); break;
    case "campfire": g.strokeStyle = dk ? "#8a6a3e" : "#6b4a2b"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(X + 4, Y + 4); g.lineTo(X + w - 4, Y + h - 4); g.moveTo(X + w - 4, Y + 4); g.lineTo(X + 4, Y + h - 4); g.stroke();
      g.fillStyle = "#e8a33d"; g.beginPath(); g.arc(cx, cy, CS * .22, 0, 7); g.fill(); g.fillStyle = "#ffd27a"; g.beginPath(); g.arc(cx, cy, CS * .1, 0, 7); g.fill(); break;
    case "rug": { g.fillStyle = dk ? "#5a2a28" : "#a64b3c"; g.fillRect(X + 3, Y + 3, w - 6, h - 6); g.strokeStyle = dk ? "#c9a227" : "#e6c27a"; g.lineWidth = 1.5; g.strokeRect(X + 6, Y + 6, w - 12, h - 12); g.setLineDash([2, 3]); g.strokeRect(X + 9, Y + 9, w - 18, h - 18); g.setLineDash([]); break; }
    case "well": g.beginPath(); g.arc(cx, cy, Math.min(w, h) * .4, 0, 7); g.fillStyle = dk ? "#6f6a62" : "#b9b1a2"; g.fill(); g.stroke(); g.beginPath(); g.arc(cx, cy, Math.min(w, h) * .25, 0, 7); g.fillStyle = dk ? "#1d2a30" : "#3c5a66"; g.fill(); g.stroke(); break;
    case "pit": g.beginPath(); g.arc(cx, cy, Math.min(w, h) * .42, 0, 7); g.fillStyle = "#0f0d0b"; g.fill(); g.stroke(); g.strokeStyle = dk ? "#6f6a62" : "#8b7e69"; g.setLineDash([2, 3]); g.beginPath(); g.arc(cx, cy, Math.min(w, h) * .3, 0, 7); g.stroke(); g.setLineDash([]); break;
    case "ladder": g.lineWidth = 1.6; g.beginPath(); g.moveTo(X + 6, Y + 2); g.lineTo(X + 6, Y + h - 2); g.moveTo(X + w - 6, Y + 2); g.lineTo(X + w - 6, Y + h - 2); for (let k = 5; k < h - 2; k += 4) { g.moveTo(X + 6, Y + k); g.lineTo(X + w - 6, Y + k); } g.stroke(); break;
    case "tent": box(X + 3, Y + 3, w - 6, h - 6, dk ? "#5f5a48" : "#cfc39b"); g.beginPath(); g.moveTo(X + 3, Y + 3); g.lineTo(X + w - 3, Y + h - 3); g.moveTo(X + w - 3, Y + 3); g.lineTo(X + 3, Y + h - 3); g.stroke(); break;
    case "tree": case "bush": { const R = Math.min(w, h) * (p.k === "tree" ? .46 : .34); g.fillStyle = dk ? "#2f4a2a" : "#4f7a3a"; g.beginPath(); for (let a = 0; a < 7; a++) { const an = a / 7 * Math.PI * 2; g.moveTo(cx + Math.cos(an) * R * .55 + R * .45, cy + Math.sin(an) * R * .55); g.arc(cx + Math.cos(an) * R * .55, cy + Math.sin(an) * R * .55, R * .45, 0, 7); } g.fill(); g.stroke(); g.fillStyle = "rgba(255,255,255,.14)"; g.beginPath(); g.arc(cx - R * .25, cy - R * .25, R * .3, 0, 7); g.fill(); break; }
    case "rock": g.fillStyle = dk ? "#5d574f" : "#a49c8c"; g.beginPath(); g.moveTo(X + w * .2, Y + h * .3); g.lineTo(X + w * .55, Y + h * .12); g.lineTo(X + w * .85, Y + h * .38); g.lineTo(X + w * .78, Y + h * .8); g.lineTo(X + w * .3, Y + h * .85); g.closePath(); g.fill(); g.stroke(); break;
    case "img": { const pic = MED_PICS.get(p.img); if (pic) g.drawImage(pic, X, Y, w, h); else { g.setLineDash([4, 3]); g.strokeRect(X + 2, Y + 2, w - 4, h - 4); g.setLineDash([]); medPicLoad(p.img); } break; }
  }
  g.restore();
}
function drawPropEd(g, p, st) {
  if (MAP_PROP_OLD.has(p.k)) drawProp(g, { kind: p.k, cells: [[p.x, p.y], [p.x + p.w - 1, p.y + p.h - 1]] }, st);
  else drawPropMore(g, p, st);
}
function medPicLoad(key) {
  if (MED_PICS.has(key)) return; MED_PICS.set(key, null);
  MAPIMG.get(key).then(b => b && loadImageCanvas(b)).then(r => { if (!r) return; MED_PICS.set(key, r.cv); if (currentMap && currentMap.kind === "drawn") { currentMap._base = null; drawMapDM(); if (HOST.on) hostSend(); } }).catch(() => {});
}

/* ---- making drawn maps ---- */
function drawnFromGen(gen) {
  const p = gen.params, rooms = JSON.parse(JSON.stringify(gen.rooms));
  return { kind: "drawn", v: 1, id: uid("dm"), name: p.name, theme: p.theme, level: p.level, party: p.party, style: p.style || "parchment", W: gen.W, H: gen.H,
    base: { g: mapRle(Array.from(gen.grid, v => v > 0 ? 1 : 0)), r: mapRle(Array.from(gen.rid, v => v + 1)) }, shapes: [],
    doors: gen.doors.map(dr => ({ x: dr.x, y: dr.y, dx: dr.dx, dy: dr.dy, kind: dr.secret ? "secret" : "door" })), icons: [], labels: [],
    props: mapDress(gen).map(pr => { const [a, b] = pr.cells[0], [c, e] = pr.cells[pr.cells.length - 1]; return { id: uid("pr"), k: pr.kind, x: a, y: b, w: c - a + 1, h: e - b + 1 }; }),
    rooms, look: {} };
}
function drawnBlank(p) {
  const [W, H] = MAP_SIZES[p.size] || MAP_SIZES.medium;
  return { kind: "drawn", v: 1, id: uid("dm"), name: p.name, theme: p.theme, level: p.level, party: p.party, style: p.style || "parchment", W, H,
    base: { g: mapRle(new Array(W * H).fill(0)), r: mapRle(new Array(W * H).fill(0)) }, shapes: [], doors: [], icons: [], labels: [], props: [], rooms: [], look: {} };
}
/* a saved record -> the runtime map (with its squares worked out) */
function drawnBuild(rec) {
  const r = JSON.parse(JSON.stringify(rec)); ["shapes", "doors", "icons", "labels", "props", "rooms"].forEach(k => { if (!Array.isArray(r[k])) r[k] = []; }); r.look = r.look || {};
  r.W = clamp(+r.W || 46, 4, 120); r.H = clamp(+r.H || 34, 4, 120);
  const d = { kind: "drawn", id: r.id, rec: r, W: r.W, H: r.H };
  drawnRefresh(d); return d;
}
function drawnRefresh(d) {
  const r = d.rec, { W, H } = d;
  d.params = { kind: "drawn", id: r.id, name: r.name || "Drawn map", theme: MAP_BG[r.theme] ? r.theme : "crypt", level: r.level || 3, party: r.party || 4, style: MAP_STYLES[r.style] ? r.style : "parchment", seed: r.id, size: "" };
  d.rooms = r.rooms; d.doors = r.doors.map(o => ({ ...o, secret: o.kind === "secret" }));
  d._masks = new Map(); d._base = null; d._cont = null;
  d._dress = r.props.filter(p => MAP_PROP_OLD.has(p.k)).map(p => ({ kind: p.k, cells: [[p.x, p.y], [p.x + p.w - 1, p.y + p.h - 1]] })); // for mapLights (braziers)
  // the squares: floor where at least half the square is floor
  const m = drawnMask(d, MED_Q), sw = W * MED_Q, sh = H * MED_Q, a = m.getContext("2d").getImageData(0, 0, sw, sh).data, samp = new Float32Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) samp[i] = a[i * 4 + 3] / 255;
  const cov = new Float32Array(W * H);
  for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) cov[Math.floor(j / MED_Q) * W + Math.floor(i / MED_Q)] += samp[j * sw + i] / (MED_Q * MED_Q);
  d._samp = samp; d.cov = cov; d.grid = Array.from(cov, v => v >= .5 ? 1 : 0);
  // room ids: from the start, then each drawn room shape (corridors painted onto rock are corridors, -1)
  const rid = Array.from(mapUnrle(r.base.r, W * H), v => v - 1), f = Array.from(mapUnrle(r.base.g, W * H));
  r.shapes.forEach((s, si) => {
    const id = 1000 + si;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!medInside(s, x + .5, y + .5)) continue; const k = y * W + x;
      if (s.op === "cut") { f[k] = 0; rid[k] = -1; continue; }
      if (s.t === "cells") { if (!f[k]) rid[k] = -1; } else rid[k] = id;
      f[k] = 1;
    }
  });
  for (let k = 0; k < W * H; k++) if (!d.grid[k]) rid[k] = -1;
  d.rid = rid;
  // each room's size for the key: the squares sharing its centre's room id
  d.rooms.forEach(o => { const id = rid[o.cy * W + o.cx]; if (id < 0) { o.x = o.cx; o.y = o.cy; o.w = o.h = 1; return; } let x0 = W, y0 = H, x1 = 0, y1 = 0; for (let k = 0; k < W * H; k++) if (rid[k] === id) { const x = k % W, y = (k - x) / W; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } o.x = x0; o.y = y0; o.w = x1 - x0 + 1; o.h = y1 - y0 + 1; });
}
function medInside(s, px, py) {
  if (s.t === "cells") return (s.c || []).some(([x, y]) => px >= x && px < x + 1 && py >= y && py < y + 1);
  if (s.t === "rect") return px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h;
  if (s.t === "ellipse") { const rx = s.w / 2, ry = s.h / 2; if (!rx || !ry) return false; const u = (px - s.x - rx) / rx, v = (py - s.y - ry) / ry; return u * u + v * v <= 1; }
  if (s.t === "poly") { const P = s.pts || []; let inside = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside; } return inside; }
  return false;
}
function medPath(g, s) {
  if (s.t === "cells") (s.c || []).forEach(([x, y]) => g.rect(x, y, 1, 1));
  else if (s.t === "rect") g.rect(s.x, s.y, s.w, s.h);
  else if (s.t === "ellipse") g.ellipse(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w / 2), Math.abs(s.h / 2), 0, 0, Math.PI * 2);
  else if (s.t === "poly" && (s.pts || []).length > 2) { g.moveTo(s.pts[0][0], s.pts[0][1]); s.pts.slice(1).forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); }
}
/* the floor as a picture, ppc pixels a square: white where there's floor (caves start with smooth walls, as generated) */
function drawnMask(d, ppc) {
  if (d._masks && d._masks.has(ppc)) return d._masks.get(ppc);
  const r = d.rec, { W, H } = d, c = document.createElement("canvas"); c.width = Math.round(W * ppc); c.height = Math.round(H * ppc); const g = c.getContext("2d");
  const base = mapUnrle(r.base.g, W * H);
  if ((r.theme === "cavern") && typeof g.filter === "string" && base.some(v => v)) {
    const s = ppc / CS, mk = () => { const cc = document.createElement("canvas"); cc.width = c.width; cc.height = c.height; const gg = cc.getContext("2d"); gg.setTransform(s, 0, 0, s, 0, 0); return [cc, gg]; };
    const [ic] = mapCaveMasks({ W, H, grid: Array.from(base), params: { seed: r.id } }, s, mk, "#000000"); g.drawImage(ic, 0, 0);
  } else { g.fillStyle = "#fff"; for (let k = 0; k < W * H; k++) if (base[k]) g.fillRect((k % W) * ppc, Math.floor(k / W) * ppc, ppc, ppc); }
  g.setTransform(ppc, 0, 0, ppc, 0, 0); g.fillStyle = "#fff";
  r.shapes.forEach(s => { g.globalCompositeOperation = s.op === "cut" ? "destination-out" : "source-over"; g.beginPath(); medPath(g, s); g.fill(); });
  g.globalCompositeOperation = "source-over";
  if (d._masks) { if (d._masks.size > 4) d._masks.delete(d._masks.keys().next().value); d._masks.set(ppc, c); }
  return c;
}
/* the walls: the floor's outline traced at quarter squares (marching squares), as closed or open lines in squares */
function drawnContours(d) {
  if (d._cont) return d._cont;
  const sw = d.W * MED_Q, sh = d.H * MED_Q, S = d._samp, v = (i, j) => i < 0 || j < 0 || i >= sw || j >= sh ? 0 : S[j * sw + i], segs = [];
  const P = (i, j) => [(i + .5) / MED_Q, (j + .5) / MED_Q], lerp = (a, b, pa, pb) => { const t = (.5 - a) / (b - a); return [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t]; };
  for (let j = -1; j < sh; j++) for (let i = -1; i < sw; i++) {
    const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), e = v(i, j + 1), idx = (a >= .5 ? 8 : 0) | (b >= .5 ? 4 : 0) | (c >= .5 ? 2 : 0) | (e >= .5 ? 1 : 0);
    if (idx === 0 || idx === 15) continue;
    const pa = P(i, j), pb = P(i + 1, j), pc = P(i + 1, j + 1), pd = P(i, j + 1);
    const T = () => lerp(a, b, pa, pb), R = () => lerp(b, c, pb, pc), B = () => lerp(e, c, pd, pc), L = () => lerp(a, e, pa, pd);
    const mid = (a + b + c + e) / 4 >= .5;
    switch (idx) {
      case 1: case 14: segs.push([L(), B()]); break; case 2: case 13: segs.push([B(), R()]); break; case 3: case 12: segs.push([L(), R()]); break;
      case 4: case 11: segs.push([T(), R()]); break; case 6: case 9: segs.push([T(), B()]); break; case 7: case 8: segs.push([L(), T()]); break;
      case 5: if (mid) segs.push([L(), T()], [B(), R()]); else segs.push([L(), B()], [T(), R()]); break;
      case 10: if (mid) segs.push([T(), R()], [L(), B()]); else segs.push([L(), T()], [B(), R()]); break;
    }
  }
  // join the pieces into lines
  const key = p => p[0].toFixed(3) + "," + p[1].toFixed(3), ends = new Map(), used = new Uint8Array(segs.length);
  segs.forEach((s, n) => [0, 1].forEach(e => { const k = key(s[e]); if (!ends.has(k)) ends.set(k, []); ends.get(k).push(n); }));
  const lines = [];
  for (let n = 0; n < segs.length; n++) {
    if (used[n]) continue; used[n] = 1; const line = [segs[n][0], segs[n][1]];
    for (const dir of [1, 0]) { // grow from the end, then from the start
      for (;;) { const tip = dir ? line[line.length - 1] : line[0], next = (ends.get(key(tip)) || []).find(m => !used[m]); if (next === undefined) break; used[next] = 1; const s = segs[next], far = key(s[0]) === key(tip) ? s[1] : s[0]; dir ? line.push(far) : line.unshift(far); }
    }
    // drop points along straight runs
    const out = [line[0]]; for (let k = 1; k < line.length - 1; k++) { const [x0, y0] = out[out.length - 1], [x1, y1] = line[k], [x2, y2] = line[k + 1]; if (Math.abs((x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0)) > .0008) out.push(line[k]); } out.push(line[line.length - 1]);
    lines.push(out);
  }
  return d._cont = lines;
}

/* ---- drawing a drawn map: the same layers as mapBase / mapLook, in any of the six looks, with the DM's style changes ---- */
function drawnStyle(d, st) {
  const L = d.rec.look || {}, look = st.look || (st.dark ? "dark" : st.hand ? "parchment" : "blue");
  const wallW = { inked: 2.4, atlas: 2.8, parchment: 3, blue: 3, dark: 4, torch: 7 }[look];
  return { ...st, look, ink: /^#[0-9a-f]{6}$/i.test(L.wall || "") ? L.wall : st.ink, wallW: clamp(+L.wallW || wallW, 1, 12), rough: L.rough !== undefined ? clamp(+L.rough, 0, 3) : (look === "inked" || look === "atlas" || look === "parchment" ? 1 : 0),
    floorC: /^#[0-9a-f]{6}$/i.test(L.floor || "") ? L.floor : st.floor || MAP_FLOOR[d.params.theme][st.dark ? 1 : 0], gridMode: ["lines", "dots", "none"].includes(L.grid) ? L.grid : "lines",
    hatchOn: L.hatch === "on" ? true : L.hatch === "off" ? false : !st.dark, hatchC: st.hatch || "rgba(70,50,30,.55)" };
}
function drawnBase(d, showGrid, player, found, s, st0) {
  const st = drawnStyle(d, st0), { W, H } = d, th = d.params.theme, PW = W * CS, PH = H * CS, look = st.look;
  const mk = () => { const c = document.createElement("canvas"); c.width = Math.round(PW * s); c.height = Math.round(PH * s); const g = c.getContext("2d"); g.setTransform(s, 0, 0, s, 0, 0); return [c, g]; };
  const [cv, g] = mk(), r = makeRng("look", d.params.seed, th, look), any = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d.cov[y * W + x] > .02;
  // 1. paper or rock, and hatching round the floor
  g.fillStyle = st.bg || MAP_BG[th]; g.fillRect(0, 0, PW, PH);
  if (look === "atlas") mapLookLayer(g, d, "paper", PW, PH, n => [120, 80, 35, Math.round(Math.max(0, n - .35) * 120)]);
  if (look === "torch") mapLookLayer(g, d, "rock", PW, PH, n => n > .5 ? [90, 80, 70, Math.round((n - .5) * 150)] : [0, 0, 0, Math.round((.5 - n) * 200)]);
  if (st.hatchOn) mapLookHatch(g, d, any, r, st.hatchC, 2.2);
  // 2. the floor: colour, the theme's texture, the grid, cut to the floor's shape
  const [fc, fg] = mk(); fg.fillStyle = st.floorC; fg.fillRect(0, 0, PW, PH);
  if (st.tex || look === "atlas") mapTexture(fg, d, st, r);
  if (look === "torch") mapLookLayer(fg, d, "floor", PW, PH, n => [0, 0, 0, Math.round(Math.abs(n - .5) * 160)]);
  if (showGrid && st.gridMode !== "none") {
    fg.strokeStyle = st.grid; fg.fillStyle = st.grid;
    if (st.gridMode === "dots") { fg.globalAlpha = 1; for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) { fg.beginPath(); fg.arc(x * CS, y * CS, 1.6, 0, 7); fg.fill(); } }
    else { fg.lineWidth = 1; fg.beginPath(); for (let x = 0; x <= W; x++) { fg.moveTo(x * CS + .5, 0); fg.lineTo(x * CS + .5, PH); } for (let y = 0; y <= H; y++) { fg.moveTo(0, y * CS + .5); fg.lineTo(PW, y * CS + .5); } fg.stroke(); }
  }
  fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = "destination-in"; fg.drawImage(drawnMask(d, CS * s), 0, 0, fc.width, fc.height); fg.globalCompositeOperation = "source-over";
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(fc, 0, 0); g.setTransform(s, 0, 0, s, 0, 0);
  // 3. walls round the floor
  const lines = drawnContours(d).filter(l => l.length > 1).map(l => l.map(([x, y]) => [x * CS, y * CS]));
  g.save(); g.lineJoin = "round"; g.lineCap = "round";
  if (look === "torch") {
    const path = new Path2D(); lines.forEach(l => l.forEach(([x, y], i) => i ? path.lineTo(x, y) : path.moveTo(x, y)));
    g.strokeStyle = st.ink; g.lineWidth = st.wallW; g.stroke(path); g.strokeStyle = "rgba(160,145,122,.55)"; g.lineWidth = 1.4; g.stroke(path);
  } else if (st.rough > 0) {
    const rc = rough.canvas(cv), R = [0, .9, 1.5, 2.4][st.rough];
    lines.forEach((l, i) => rc.linearPath(l, { seed: i + 1, roughness: R, bowing: 1, strokeWidth: st.wallW, stroke: st.ink, preserveVertices: true }));
  } else { const path = new Path2D(); lines.forEach(l => l.forEach(([x, y], i) => i ? path.lineTo(x, y) : path.moveTo(x, y))); g.strokeStyle = st.ink; g.lineWidth = st.wallW; g.stroke(path); if (st.dark) { g.strokeStyle = "rgba(201,180,138,.35)"; g.lineWidth = 1; g.stroke(path); } }
  g.restore();
  // 4. doors, furniture and pictures, stairs and icons, labels
  mapDrawDoors(g, d, st, player, found);
  d.rec.props.forEach(p => drawPropEd(g, p, st));
  mapDrawIcons(g, { rooms: [...d.rooms, { icons: d.rec.icons }] }, st, player);
  d.rec.labels.forEach(lb => { if (player && lb.dm) return; const size = clamp(+lb.size || 16, 8, 60); g.save(); g.font = `600 ${size}px Cinzel, Georgia, serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.lineWidth = 4; g.strokeStyle = st.dark ? "rgba(0,0,0,.8)" : "rgba(255,250,235,.85)"; g.strokeText(lb.text, lb.x * CS, lb.y * CS); g.fillStyle = st.dark ? "#e7d9b8" : st.ink; g.fillText(lb.text, lb.x * CS, lb.y * CS); g.restore(); });
  // 5. finishing
  if (st.grain || look === "inked") { const nr = makeRng("grain", d.params.seed); g.fillStyle = look === "inked" ? "rgba(30,25,20,.05)" : "rgba(90,60,30,.06)"; for (let i = 0; i < (PW * PH) / 100; i++) g.fillRect(nr.f() * PW, nr.f() * PH, 1.2, 1.2); }
  if (look === "atlas") mapLookLayer(g, d, "stains", PW, PH, (n, x, y) => { const edge = Math.min(x, y, PW - x, PH - y) / 55, burn = Math.max(0, 1 - edge) ** 2; return [92, 55, 20, Math.round(Math.min(1, Math.max(0, n - .6) * 1.6 + burn * .75) * 170)]; });
  if (look === "torch") {
    const lights = mapLights(d, (x, y) => x >= 0 && y >= 0 && x < W && y < H && d.grid[y * W + x] > 0), [lc, lg] = mk();
    lg.fillStyle = "rgba(0,0,0,.62)"; lg.fillRect(0, 0, PW, PH); lg.globalCompositeOperation = "destination-out";
    lights.forEach(l => { const gr = lg.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.rad); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(.55, "rgba(0,0,0,.6)"); gr.addColorStop(1, "rgba(0,0,0,0)"); lg.fillStyle = gr; lg.fillRect(l.x - l.rad, l.y - l.rad, l.rad * 2, l.rad * 2); });
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(lc, 0, 0); g.setTransform(s, 0, 0, s, 0, 0);
    g.save(); g.globalCompositeOperation = "lighter"; lights.forEach(l => { const gr = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.rad * .8); gr.addColorStop(0, "rgba(255,150,60,.3)"); gr.addColorStop(1, "rgba(255,120,40,0)"); g.fillStyle = gr; g.fillRect(l.x - l.rad, l.y - l.rad, l.rad * 2, l.rad * 2); }); g.restore();
  }
  return cv;
}
/* walls for a VTT file: the traced outline, plus secret doors the players haven't found */
function drawnVttWalls(d, found) {
  const out = []; drawnContours(d).forEach(l => { for (let i = 1; i < l.length; i++) out.push([{ x: l[i - 1][0], y: l[i - 1][1] }, { x: l[i][0], y: l[i][1] }]); });
  d.doors.filter(dr => dr.secret && !found.has(dr.x + "," + dr.y)).forEach(dr => out.push(mapDoorEdge(dr)));
  return out;
}
/* what a campaign or World place keeps */
function drawnRecord(d) { const r = JSON.parse(JSON.stringify(d.rec)); return r; }
