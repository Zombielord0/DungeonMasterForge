/* ======================= Dungeon Map: the hand-drawn looks (2026-11-24) =======================
   Three extra Styles for generated dungeons: "inked" (Inked sketch), "atlas" (Old atlas) and "torch" (Stone and torchlight).
   mapBase (03-dungeon-map.js) hands any style with `look` in MAP_STYLES to mapLook, which draws the same grid-area picture:
   rock, floor, walls, doors, furniture and icons. Room numbers, fog, tokens and the header are still drawn by drawDungeon.
   Like the other looks, this only draws: it uses its own seeded streams (makeRng("look"…), mapNoise), so it never changes a
   dungeon's layout, and the same map always looks the same (the TV and the DM's window match).
   Hand-drawn lines come from Rough.js (03a-rough.js, MIT), seeded so they don't wobble between redraws. */

// a soft noise layer drawn small and stretched over the map: cheap, and stains and mottling are soft anyway.
// f(n, x, y) gives [r, g, b, a] for noise n in [0, 1] at (x, y) in map pixels.
function mapLookLayer(g, d, salt, PW, PH, f) {
  const k = 5, w = Math.ceil(PW / k), h = Math.ceil(PH / k), c = document.createElement("canvas"); c.width = w; c.height = h;
  const cg = c.getContext("2d"), img = cg.createImageData(w, h), px = img.data, nz = mapNoise(d.params.seed + "|" + salt);
  const fbm = (x, y) => { let t = 0, a = .5, q = 1; for (let o = 0; o < 4; o++) { t += nz(x * q, y * q) * a; a *= .5; q *= 2; } return t / .9375 * .5 + .5; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f(fbm(x * k / 110, y * k / 110), x * k, y * k), i = (y * w + x) * 4; px[i] = v[0]; px[i + 1] = v[1]; px[i + 2] = v[2]; px[i + 3] = v[3]; }
  cg.putImageData(img, 0, 0); g.save(); g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, w * k, h * k); g.restore();
}
// the dungeon's outline as long straight runs (each a wall line from square corner to square corner)
function mapWallRuns(d, floor) {
  const { W, H } = d, runs = [];
  for (let y = 0; y <= H; y++) { let a = null; for (let x = 0; x <= W; x++) { const b = x < W && floor(x, y - 1) !== floor(x, y); if (b && a === null) a = x; if (!b && a !== null) { runs.push([a, y, x, y]); a = null; } } }
  for (let x = 0; x <= W; x++) { let a = null; for (let y = 0; y <= H; y++) { const b = y < H && floor(x - 1, y) !== floor(x, y); if (b && a === null) a = y; if (!b && a !== null) { runs.push([x, a, x, y]); a = null; } } }
  return runs;
}
// pen hatching on the rock next to the dungeon, crossed close to the walls (One Page Dungeon style)
function mapLookHatch(g, d, floor, r, col, reach) {
  const { W, H } = d; g.save(); g.strokeStyle = col; g.lineCap = "round";
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (floor(x, y)) continue;
    let dist = 9; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (floor(x + dx, y + dy)) dist = Math.min(dist, Math.hypot(dx, dy));
    if (dist > reach) continue;
    const a = r.f() * Math.PI, ca = Math.cos(a), sa = Math.sin(a), mx = x * CS + CS / 2 + (r.f() - .5) * 5, my = y * CS + CS / 2 + (r.f() - .5) * 5;
    g.lineWidth = .9; g.beginPath();
    for (let k = -2; k <= 2; k++) {
      const ox = -sa * k * 3.4, oy = ca * k * 3.4, L = 8.5 - Math.abs(k) * 1.3 + r.f() * 1.5;
      g.moveTo(mx + ox - ca * L, my + oy - sa * L); g.quadraticCurveTo(mx + ox + (r.f() - .5) * 2, my + oy + (r.f() - .5) * 2, mx + ox + ca * L, my + oy + sa * L);
    }
    g.stroke();
    if (dist <= 1.2) {
      const b = a + Math.PI / 2 + (r.f() - .5) * .5, cb = Math.cos(b), sb = Math.sin(b); g.lineWidth = .6; g.beginPath();
      for (let k = -1; k <= 1; k++) { const ox = -sb * k * 4, oy = cb * k * 4; g.moveTo(mx + ox - cb * 6, my + oy - sb * 6); g.lineTo(mx + ox + cb * 6, my + oy + sb * 6); }
      g.stroke();
    }
  }
  g.restore();
}
// where the torches burn: a wall corner or two in each room, and every brazier
function mapLights(d, floor) {
  const r = makeRng("light", d.params.seed, d.params.theme), out = [];
  d.rooms.forEach(o => {
    const spots = [[o.x, o.y], [o.x + o.w - 1, o.y + o.h - 1], [o.x + o.w - 1, o.y], [o.x, o.y + o.h - 1]].filter(([x, y]) => floor(x, y));
    const n = o.w * o.h > 30 ? 2 : 1;
    for (let i = 0; i < Math.min(n, spots.length); i++) { const [x, y] = spots[i]; out.push({ x: (x + .5) * CS, y: (y + .5) * CS, rad: 80 + r.f() * 40, flame: true }); }
  });
  mapDress(d).filter(p => p.kind === "brazier").forEach(p => { const [x, y] = p.cells[0]; out.push({ x: (x + .5) * CS, y: (y + .5) * CS, rad: 120, flame: false }); });
  return out;
}
function mapCompassRose(g, cx, cy, R, ink) {
  g.save(); g.translate(cx, cy); g.strokeStyle = ink; g.lineWidth = 1.1;
  g.beginPath(); g.arc(0, 0, R * .86, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, R * .74, 0, 7); g.stroke();
  for (let k = 0; k < 8; k++) {
    const L = k % 2 ? R * .55 : R; g.save(); g.rotate(k * Math.PI / 4);
    g.beginPath(); g.moveTo(0, -L); g.lineTo(R * .12, 0); g.lineTo(0, 0); g.closePath(); g.fillStyle = ink; g.fill();
    g.beginPath(); g.moveTo(0, -L); g.lineTo(-R * .12, 0); g.lineTo(0, 0); g.closePath(); g.fillStyle = "#ead6aa"; g.fill(); g.stroke(); g.restore();
  }
  g.fillStyle = "#8b1e1e"; g.font = "bold 12px Cinzel, Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("N", 0, -R - 8);
  g.restore();
}

function mapLook(d, showGrid, player, found, s, st) {
  const { W, H, grid } = d, th = d.params.theme, look = st.look, PW = W * CS, PH = H * CS;
  const mk = () => { const c = document.createElement("canvas"); c.width = Math.round(PW * s); c.height = Math.round(PH * s); const g = c.getContext("2d"); g.setTransform(s, 0, 0, s, 0, 0); return [c, g]; };
  const [cv, g] = mk(), floor = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y * W + x] > 0;
  const r = makeRng("look", d.params.seed, th, look);

  // 1. paper, or rock in the dark
  g.fillStyle = st.bg; g.fillRect(0, 0, PW, PH);
  if (look === "atlas") mapLookLayer(g, d, "paper", PW, PH, n => [120, 80, 35, Math.round(Math.max(0, n - .35) * 120)]);
  if (look === "torch") mapLookLayer(g, d, "rock", PW, PH, n => n > .5 ? [90, 80, 70, Math.round((n - .5) * 150)] : [0, 0, 0, Math.round((.5 - n) * 200)]);
  if (look !== "torch") mapLookHatch(g, d, floor, r, st.hatch, look === "atlas" ? 2.4 : 2.2);

  // 2. the floor layer, later cut to the dungeon's shape
  const [fc, fg] = mk(); fg.fillStyle = st.floor || MAP_FLOOR[th][1]; fg.fillRect(0, 0, PW, PH);
  if (look === "atlas") mapTexture(fg, d, st, r);
  if (look === "torch") {
    const slabs = th !== "cavern" && th !== "mine";
    for (let y = 0; y < H; y++) for (let x = -1; x <= W; x++) {
      if (!floor(x, y) && !floor(x + 1, y)) continue;
      const X = x * CS + (slabs && y % 2 ? CS / 2 : 0), Y = y * CS, v = r.f();
      fg.fillStyle = v < .5 ? `rgba(0,0,0,${.08 + v * .3})` : `rgba(255,240,220,${(v - .5) * .14})`; fg.fillRect(X, Y, CS, CS);
      if (slabs) { fg.strokeStyle = "rgba(10,8,6,.65)"; fg.lineWidth = 1.2; fg.strokeRect(X + .6, Y + .6, CS - 1.2, CS - 1.2); }
    }
    if (th !== "crypt" && th !== "keep") mapTexture(fg, d, st, r);
    mapLookLayer(fg, d, "floor", PW, PH, n => [0, 0, 0, Math.round(Math.abs(n - .5) * 160)]);
  }
  if (showGrid) {
    fg.strokeStyle = st.grid; fg.lineWidth = look === "inked" ? .7 : 1; fg.beginPath();
    const wob = look === "inked" ? 1.6 : 0, nz = mapNoise(d.params.seed + "|grid");
    for (let x = 0; x <= W; x++) for (let y = 0; y <= H; y++) { const px = x * CS + nz(x * .7, y * .3) * wob; y ? fg.lineTo(px, y * CS) : fg.moveTo(px, 0); }
    for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) { const py = y * CS + nz(x * .3 + 40, y * .7) * wob; x ? fg.lineTo(x * CS, py) : fg.moveTo(0, py); }
    fg.stroke();
  }

  // 3. cut the floor to shape and draw the walls
  if (th === "cavern" && typeof g.filter === "string") {
    const [ic, oc] = mapCaveMasks(d, s, mk, look === "torch" ? "#4a4139" : st.ink); /* in the dark, a cave's edge is lit stone */
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = "destination-in"; fg.drawImage(ic, 0, 0); fg.globalCompositeOperation = "source-over";
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(oc, 0, 0); g.drawImage(fc, 0, 0); g.setTransform(s, 0, 0, s, 0, 0);
    d._caveSmooth = true;
  } else {
    const [mc, mg] = mk(); mg.fillStyle = "#fff"; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (floor(x, y)) mg.fillRect(x * CS, y * CS, CS, CS);
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = "destination-in"; fg.drawImage(mc, 0, 0); fg.globalCompositeOperation = "source-over";
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(fc, 0, 0); g.setTransform(s, 0, 0, s, 0, 0);
    const runs = mapWallRuns(d, floor);
    if (look === "torch") {
      g.save(); g.lineCap = "square";
      g.strokeStyle = st.ink; g.lineWidth = 7; g.beginPath(); runs.forEach(([a, b, c, e]) => { g.moveTo(a * CS, b * CS); g.lineTo(c * CS, e * CS); }); g.stroke();
      g.strokeStyle = "rgba(160,145,122,.55)"; g.lineWidth = 1.4; g.beginPath(); runs.forEach(([a, b, c, e]) => { g.moveTo(a * CS, b * CS); g.lineTo(c * CS, e * CS); }); g.stroke();
      g.restore();
    } else {
      const rc = rough.canvas(cv), o = look === "atlas" ? { roughness: 1.3, bowing: 1.8, strokeWidth: 2.8 } : { roughness: 1.15, bowing: 1.4, strokeWidth: 2.4 };
      runs.forEach(([a, b, c, e], i) => rc.line(a * CS, b * CS, c * CS, e * CS, { ...o, seed: i + 1, stroke: st.ink }));
    }
  }

  // 4. doors, furniture and icons (the shared drawings, in this look's colours)
  mapDrawDoors(g, d, st, player, found);
  mapDress(d).forEach(pr => drawProp(g, pr, st));
  mapDrawIcons(g, d, st, player);

  // 5. finishing: old paper, or torchlight
  if (look === "inked") { const nr = makeRng("grain", d.params.seed); g.fillStyle = "rgba(30,25,20,.05)"; for (let i = 0; i < (PW * PH) / 110; i++) g.fillRect(nr.f() * PW, nr.f() * PH, 1.1, 1.1); }
  if (look === "atlas") {
    mapLookLayer(g, d, "stains", PW, PH, (n, x, y) => { const edge = Math.min(x, y, PW - x, PH - y) / 55, burn = Math.max(0, 1 - edge) ** 2;
      return [92, 55, 20, Math.round(Math.min(1, Math.max(0, n - .6) * 1.6 + burn * .75) * 170)]; });
  }
  if (look === "torch") {
    const lights = mapLights(d, floor), [lc, lg] = mk();
    lg.fillStyle = "rgba(0,0,0,.62)"; lg.fillRect(0, 0, PW, PH); lg.globalCompositeOperation = "destination-out";
    lights.forEach(l => { const gr = lg.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.rad); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(.55, "rgba(0,0,0,.6)"); gr.addColorStop(1, "rgba(0,0,0,0)"); lg.fillStyle = gr; lg.fillRect(l.x - l.rad, l.y - l.rad, l.rad * 2, l.rad * 2); });
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(lc, 0, 0); g.setTransform(s, 0, 0, s, 0, 0);
    g.save(); g.globalCompositeOperation = "lighter";
    lights.forEach(l => { const gr = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.rad * .8); gr.addColorStop(0, "rgba(255,150,60,.3)"); gr.addColorStop(1, "rgba(255,120,40,0)"); g.fillStyle = gr; g.fillRect(l.x - l.rad, l.y - l.rad, l.rad * 2, l.rad * 2); });
    g.restore();
    g.save(); lights.filter(l => l.flame).forEach(l => { g.fillStyle = "#ffd27a"; g.shadowColor = "#ff9a3c"; g.shadowBlur = 8 * s; g.beginPath(); g.arc(l.x, l.y, 2.8, 0, 7); g.fill(); }); g.restore();
  }
  return cv;
}
