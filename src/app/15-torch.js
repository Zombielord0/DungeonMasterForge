/* 15-torch.js: The torchlit corridor animation in the header. */

/* ======================= Torchlit corridor scene + realistic flames ======================= */
(function () {
  "use strict";
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COARSE = window.matchMedia && matchMedia("(pointer: coarse)").matches; /* phones and tablets */
  const rand = (a, b) => a + Math.random() * (b - a);
  // seeded rng so the corridor looks the same every load
  let seed = 1337; const srand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ---------- flame sprite cache ---------- */
  // soft round sprites in the colours a real flame passes through, drawn additively
  const STAGES = [[255, 250, 225], [255, 236, 170], [255, 205, 110], [255, 168, 64], [250, 128, 36], [224, 88, 22], [176, 52, 14], [110, 26, 8]];
  const SPR = STAGES.map(([r, g, b]) => {
    const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(.35, `rgba(${r},${g},${b},.55)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c;
  });
  const SPR_BLUE = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(120,160,255,1)"); gr.addColorStop(1, "rgba(80,120,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c; })();
  const GLOW = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
    const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, "rgba(255,170,80,.9)"); gr.addColorStop(.18, "rgba(255,130,50,.45)"); gr.addColorStop(.5, "rgba(200,80,30,.12)"); gr.addColorStop(1, "rgba(160,60,20,0)");
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return c;
  })();

  /* ---------- particle flame ---------- */
  function Flame(size, rate = 70) { this.size = size; this.rate = rate; this.p = []; this.sparks = []; this.t = Math.random() * 100; this.acc = 0; }
  Flame.prototype.update = function (dt) {
    this.t += dt;
    const s = this.size, rate = this.rate; // particles per second
    this.acc += dt * rate;
    // wind sway: slow, layered noise
    this.sway = Math.sin(this.t * 1.7) * .35 + Math.sin(this.t * 4.3 + 1) * .2 + Math.sin(this.t * 9.1) * .08;
    while (this.acc >= 1) {
      this.acc--;
      const life = rand(.45, .95);
      this.p.push({ x: rand(-.26, .26) * s, y: rand(-.05, .06) * s, vx: rand(-.12, .12) * s, vy: -rand(2.2, 3.4) * s, r: rand(.2, .32) * s, life, age: 0 });
    }
    if (Math.random() < dt * 2.2) this.sparks.push({ x: rand(-.2, .2) * s, y: -s * .4, vx: rand(-.6, .6) * s, vy: -rand(2.5, 4.5) * s, life: rand(.6, 1.4), age: 0 });
    for (const q of this.p) {
      q.age += dt; const k = q.age / q.life;
      q.vx += (this.sway * s * 1.8 - q.x * 5) * dt * (0.5 + k * 1.5);   // pulled inward and swayed, more as it rises
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy *= (1 - dt * .6);
    }
    for (const q of this.sparks) { q.age += dt; q.vx += this.sway * s * dt * 2; q.x += q.vx * dt; q.y += q.vy * dt; q.vy *= (1 - dt * .8); }
    this.p = this.p.filter(q => q.age < q.life); this.sparks = this.sparks.filter(q => q.age < q.life);
  };
  Flame.prototype.draw = function (ctx, x, y, alpha = 1) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const q of this.p) {
      const k = q.age / q.life;
      const st = Math.min(STAGES.length - 1, 1 + Math.floor(k * 1.3 * (STAGES.length - 1) + Math.abs(q.x) / this.size * 4));
      const r = q.r * (1 - k * .7) * (k < .12 ? .6 + k * 3.3 : 1);
      ctx.globalAlpha = alpha * (k < .1 ? k * 10 : 1) * (1 - k) * .3;
      ctx.drawImage(SPR[st], x + q.x - r, y + q.y - r * 1.6, r * 2, r * 3.2);
    }
    // hot core
    ctx.globalAlpha = alpha * .4;
    const c = this.size * .2; ctx.drawImage(SPR[0], x - c + this.sway * this.size * .08, y - c * 2.4, c * 2, c * 3.2);
    // faint blue base where the fuel burns hottest
    ctx.globalAlpha = alpha * .12; ctx.drawImage(SPR_BLUE, x - c * 1.2, y - c * 1.1, c * 2.4, c * 1.4);
    for (const q of this.sparks) {
      const k = q.age / q.life; ctx.globalAlpha = alpha * (1 - k);
      const r = Math.max(.6, this.size * .05);
      ctx.drawImage(SPR[2 + Math.floor(k * 4)], x + q.x - r, y + q.y - r, r * 2, r * 2);
    }
    ctx.restore();
  };

  /* ---------- corridor geometry ---------- */
  const cv = document.createElement("canvas"); cv.id = "bgScene"; cv.setAttribute("aria-hidden", "true");
  document.body.prepend(cv);
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1, F = 1, CX = 0, CY = 0, staticCv = null, torches = [], drips = [], dripSources = [], floorStones = 0, cobwebs = 0;
  const FLOOR = -1.15, WALL = 1.75, SPRING = 1.05, ZMAX = 34;
  const proj = (x, y, z) => [CX + x * F / z, CY - y * F / z];
  const ARCH_Z = [3.2, 6.6, 10, 13.4, 16.8, 20.2, 23.6, 27];
  const TORCH_Z = ARCH_Z.slice(0, 7).map(z => z - .25);
  const lightAt = (x, y, z) => {
    let L = 0;
    for (const tz of TORCH_Z) for (const tx of [-WALL + .62, WALL - .62]) { const d2 = (x - tx) ** 2 + (y - .85) ** 2 * 1.4 + (z - tz) ** 2; L += 1 / (1 + d2 * 3.4); }
    return Math.min(1.25, L);
  };
  const FOG = [22, 30, 52], WARM = [255, 150, 70];
  function shade(base, x, y, z, wet = 0) {
    const L = lightAt(x, y, z), fz = 1 - Math.exp(-z / 11), far = Math.min(1, z / ZMAX);
    const k = base[0] / 60;
    // cool gray-blue stone in shadow; warm torchlight only close to a flame
    let r = base[0] * .37 + WARM[0] * L * .5 * k, g = base[1] * .45 + WARM[1] * L * .4 * k, b = base[2] * .68 + WARM[2] * L * .22 * k;
    // cool ambient bounce from the bright doorway, and a wet sheen down the middle of the floor
    const cool = .25 + far * .6 + wet * .7; r += 6 * cool; g += 11 * cool; b += 24 * cool;
    const fog = [FOG[0] * .6 + far * 70, FOG[1] * .6 + far * 85, FOG[2] * .6 + far * 120];
    return `rgb(${Math.round(r + (fog[0] - r) * fz)},${Math.round(g + (fog[1] - g) * fz)},${Math.round(b + (fog[2] - b) * fz)})`;
  }
  function quad(c, pts, fill, stroke, lw) {
    c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
    c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }
  /* ---------- rounded, bevelled stones ---------- */
  const rgbOf = str => str.match(/[\d.]+/g).slice(0, 3).map(Number);
  const rgbMul = (a, f, add = 0) => `rgb(${a.map(v => Math.max(0, Math.min(255, Math.round(v * f + add)))).join(",")})`;
  function stone(c, pts, col, o = {}) {
    // pts: 4 screen-space corners. Draws an inset, slightly irregular, rounded stone with a domed shading and a bevel.
    const cx = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4, cy = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
    const edges = pts.map((p, i) => Math.hypot(pts[(i + 1) % 4][0] - p[0], pts[(i + 1) % 4][1] - p[1]));
    const size = Math.min(...edges);
    const base = rgbOf(col);
    if (size < 2.2) { quad(c, pts, col); return; }
    const longest = Math.max(...edges);
    if (longest / size > 9) o = Object.assign({}, o, { bulge: 0, round: Math.min(o.round ?? .26, .12) });
    const gap = Math.max(.5, size * (o.mortar ?? .09));
    const rough = o.rough || 0, jit = size * (.06 + rough * .12);
    const P = pts.map(([x, y]) => { const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1; return [x + dx / d * gap * 1.3 + (srand() - .5) * jit, y + dy / d * gap * 1.3 + (srand() - .5) * jit]; });
    // add a bulging midpoint on every edge so stones read as rounded, hand-cut blocks
    const ring = [];
    P.forEach((p, i) => {
      const q = P[(i + 1) % 4]; ring.push(p);
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy) || 1;
      if (rough) {
        // jagged, hand-hewn edge: a few points pushed in and out along each side
        const k = 2 + (srand() * 2 | 0);
        for (let j = 1; j <= k; j++) { const t = j / (k + 1), ex = p[0] + (q[0] - p[0]) * t, ey = p[1] + (q[1] - p[1]) * t, b = size * rough * (srand() - .35) * .17; ring.push([ex + dx / d * b, ey + dy / d * b]); }
      } else {
        const b = size * (o.bulge ?? .05) * (.4 + srand() * .9);
        ring.push([mx + dx / d * b, my + dy / d * b]);
      }
    });
    const r = size * (o.round ?? .26);
    // corner radii are fixed once so every pass (fill, clip, bevel, chips) follows the same outline;
    // and are capped by the corner angle, because a large radius on a sharp corner makes arcTo draw a runaway tangent line
    const rad = ring.map((a, i) => {
      const n = ring.length, b = ring[(i + 1) % n], pv = ring[(i + n - 1) % n];
      const ux = pv[0] - a[0], uy = pv[1] - a[1], vx = b[0] - a[0], vy = b[1] - a[1], lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
      const want = rough ? r * (.3 + srand() * .7) : i % 2 ? r * .25 : r;
      if (!lu || !lv) return 0;
      // arcTo's tangent points sit r / tan(θ/2) from the corner; keep them on the two edges
      const th = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv))));
      return Math.min(Math.min(lu, lv) * .45 * Math.tan(th / 2), want);
    });
    const path = () => {
      c.beginPath();
      const n = ring.length, m0 = [(ring[n - 1][0] + ring[0][0]) / 2, (ring[n - 1][1] + ring[0][1]) / 2];
      c.moveTo(...m0);
      for (let i = 0; i < n; i++) {
        const a = ring[i], b = ring[(i + 1) % n];
        if (rad[i] > .05) c.arcTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, rad[i]); else c.lineTo(a[0], a[1]);
      }
      c.closePath();
    };
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    ring.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
    const w = maxX - minX, h = maxY - minY, R = Math.max(w, h) * .62;
    const tone = .9 + srand() * .22;
    const g = c.createRadialGradient(cx - w * .12, cy - h * .22, R * .05, cx, cy, R);
    g.addColorStop(0, rgbMul(base, 1.45 * tone, 8)); g.addColorStop(.45, rgbMul(base, 1.05 * tone)); g.addColorStop(1, rgbMul(base, .5 * tone));
    path(); c.fillStyle = g; c.fill();
    if (size > 6) {
      c.save(); path(); c.clip();
      const lw = Math.max(1, size * .09);
      c.lineWidth = lw;
      c.translate(0, lw * .7); path(); c.strokeStyle = `rgba(255,196,140,${o.lit ?? .13})`; c.stroke();
      c.translate(0, -lw * 1.4); path(); c.strokeStyle = "rgba(0,0,0,.45)"; c.stroke();
      c.restore();
      // pitting
      if (size > 14) { const k = 2 + (srand() * 4 | 0); for (let i = 0; i < k; i++) { c.fillStyle = `rgba(0,0,0,${.12 + srand() * .15})`; c.beginPath(); c.arc(minX + w * (.2 + srand() * .6), minY + h * (.2 + srand() * .6), Math.max(.5, size * (.015 + srand() * .03)), 0, Math.PI * 2); c.fill(); } }
      if (o.chips && size > 10) {
        // broken faces: a lighter upper facet and a shadowed lower plane, like split stone
        const fp = () => [minX + w * srand(), minY + h * srand()];
        c.save(); path(); c.clip();
        c.fillStyle = `rgba(190,205,240,${.05 + srand() * .06})`; c.beginPath(); c.moveTo(minX, minY); c.lineTo(minX + w * (.4 + srand() * .5), minY); c.lineTo(minX + w * (.15 + srand() * .4), minY + h * (.3 + srand() * .35)); c.lineTo(minX, minY + h * (.4 + srand() * .4)); c.fill();
        c.fillStyle = `rgba(0,0,0,${.14 + srand() * .14})`; c.beginPath(); c.moveTo(maxX, maxY); c.lineTo(minX + w * (.2 + srand() * .4), maxY); c.lineTo(minX + w * (.5 + srand() * .3), minY + h * (.5 + srand() * .3)); c.lineTo(maxX, minY + h * (.3 + srand() * .4)); c.fill();
        // chipped corners and edge nicks
        const n = 1 + (srand() * 3 | 0);
        for (let i = 0; i < n; i++) { const a = ring[(srand() * ring.length) | 0], cs = size * (.08 + srand() * .12); c.fillStyle = `rgba(0,0,0,${.35 + srand() * .25})`; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + (cx - a[0]) / Math.hypot(cx - a[0], cy - a[1] || 1) * cs + (srand() - .5) * cs, a[1] + (cy - a[1]) / Math.hypot(cx - a[0], cy - a[1] || 1) * cs); c.lineTo(a[0] + (srand() - .5) * cs * 1.6, a[1] + (srand() - .5) * cs * 1.6); c.fill(); }
        // fine grit
        if (size > 22) { const k = 10 + (srand() * 12 | 0); for (let i = 0; i < k; i++) { const [gx, gy] = fp(); c.fillStyle = srand() < .5 ? `rgba(0,0,0,${.2 + srand() * .2})` : `rgba(200,215,255,${.06 + srand() * .08})`; c.fillRect(gx, gy, Math.max(.6, size * .012), Math.max(.6, size * .012)); } }
        c.restore();
      }
      // the odd hairline crack
      if (size > 34 && srand() < .14) { c.strokeStyle = "rgba(0,0,0,.5)"; c.lineWidth = Math.max(.6, size * .015); c.beginPath(); let x = minX + w * (.25 + srand() * .5), y = minY + h * .12; c.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (srand() - .5) * w * .18; y += h * .2; c.lineTo(x, y); } c.stroke(); }
      // wet sheen on floor cobbles
      if (o.wet > .15 && size > 7) { const sg = c.createRadialGradient(cx - w * .1, cy - h * .25, 0, cx - w * .1, cy - h * .25, w * .35); sg.addColorStop(0, `rgba(175,195,255,${Math.min(.28, o.wet * .3)})`); sg.addColorStop(1, "rgba(175,195,255,0)"); c.fillStyle = sg; path(); c.fill(); }
    }
  }
  function mortar(c, pts, col) { quad(c, pts, rgbMul(rgbOf(col), .16)); }
  function drawBrazier(c, wx, wz, s, side) {
    // returns the screen point at the centre of the bowl rim, where the flame sits
    const RIM = .75, iron = "#15161b", ironLit = "#5a4a40";
    const P = (dx, y, dz) => proj(wx + dx, y, wz + dz);
    c.lineCap = "round"; c.lineJoin = "round";
    // tripod legs with curled feet
    const hub = P(0, FLOOR + .28, 0);
    [[-.2, -.1], [.2, -.1], [0, .16]].forEach(([fx, fz]) => {
      const foot = P(fx, FLOOR, fz), knee = P(fx * .55, FLOOR + .1, fz * .55);
      c.strokeStyle = iron; c.lineWidth = Math.max(1, .022 * s);
      c.beginPath(); c.moveTo(...hub); c.quadraticCurveTo(...knee, ...foot); c.stroke();
      c.beginPath(); c.arc(foot[0] + Math.sign(fx || side) * .012 * s, foot[1] - .01 * s, .012 * s, 0, Math.PI * 2); c.stroke();
    });
    // shaft with two forged collars
    const top = P(0, RIM - .1, 0);
    const sg = c.createLinearGradient(hub[0] - .03 * s, 0, hub[0] + .03 * s, 0);
    sg.addColorStop(0, "#06070a"); sg.addColorStop(.35, "#3b3d47"); sg.addColorStop(1, "#040406");
    c.strokeStyle = sg; c.lineWidth = Math.max(1.4, .045 * s); c.beginPath(); c.moveTo(...hub); c.lineTo(...top); c.stroke();
    [.15, .62].forEach(t => { const [kx, ky] = [hub[0] + (top[0] - hub[0]) * t, hub[1] + (top[1] - hub[1]) * t]; c.fillStyle = iron; c.beginPath(); c.ellipse(kx, ky, .03 * s, .014 * s, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = "rgba(255,170,90,.18)"; c.lineWidth = Math.max(.5, .004 * s); c.stroke(); });
    // bowl: shallow iron dish with a rolled rim and rivets
    const [rx, ry] = P(0, RIM, 0), sb = Math.min(s, 300), bw = .2 * sb, bh = .05 * sb, depth = .2 * sb;
    const bg = c.createLinearGradient(0, ry - bh, 0, ry + depth);
    bg.addColorStop(0, ironLit); bg.addColorStop(.25, "#2a2b33"); bg.addColorStop(1, "#030304");
    c.fillStyle = bg; c.beginPath(); c.moveTo(rx - bw, ry); c.bezierCurveTo(rx - bw * .9, ry + depth * 1.1, rx + bw * .9, ry + depth * 1.1, rx + bw, ry); c.ellipse(rx, ry, bw, bh, 0, 0, Math.PI, true); c.fill();
    c.strokeStyle = "rgba(0,0,0,.6)"; c.lineWidth = Math.max(.6, .006 * s); c.beginPath(); c.moveTo(rx - bw * .96, ry + depth * .35); c.bezierCurveTo(rx - bw * .5, ry + depth * .62, rx + bw * .5, ry + depth * .62, rx + bw * .96, ry + depth * .35); c.stroke();
    for (let k = -3; k <= 3; k++) { const t = k / 3.6; c.fillStyle = "rgba(255,180,110,.35)"; c.beginPath(); c.arc(rx + t * bw * .9, ry + depth * (.42 + (1 - t * t) * .14), Math.max(.5, .007 * s), 0, Math.PI * 2); c.fill(); }
    // glowing coals inside the rim
    const cg = c.createRadialGradient(rx, ry, 0, rx, ry, bw);
    cg.addColorStop(0, "rgba(255,190,90,.95)"); cg.addColorStop(.45, "rgba(220,80,20,.85)"); cg.addColorStop(1, "rgba(60,14,6,.9)");
    c.fillStyle = cg; c.beginPath(); c.ellipse(rx, ry, bw * .92, bh * .8, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(255,170,90,.55)"; c.lineWidth = Math.max(.8, .012 * s); c.beginPath(); c.ellipse(rx, ry, bw, bh, 0, 0, Math.PI * 2); c.stroke();
    return [rx, ry, 2 * bw];
  }
  function drawCobweb(c, cx, cy, r, dir) {
    // corner web: radial threads fanning out from the corner, with sagging cross-strands
    const a0 = dir < 0 ? 0 : Math.PI / 2, n = 5 + (srand() * 3 | 0), rings = 4 + (srand() * 2 | 0);
    const th = []; for (let i = 0; i < n; i++) th.push(a0 + (Math.PI / 2) * (i / (n - 1)) + (srand() - .5) * .12);
    c.save(); c.lineWidth = Math.max(.5, r * .008); c.strokeStyle = `rgba(205,215,235,${.1 + srand() * .07})`;
    c.beginPath(); th.forEach(a => { const L = r * (.75 + srand() * .3); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); }); c.stroke();
    for (let k = 1; k <= rings; k++) {
      const rr = r * k / (rings + .6); c.beginPath();
      th.forEach((a, i) => { const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (!i) { c.moveTo(x, y); return; } const pa = th[i - 1], mx = cx + Math.cos((a + pa) / 2) * rr * .82, my = cy + Math.sin((a + pa) / 2) * rr * .82 + rr * .05; c.quadraticCurveTo(mx, my, x, y); });
      c.stroke();
    }
    // a torn strand hanging loose
    c.beginPath(); const ta = th[(n / 2) | 0], tr = r * .9; c.moveTo(cx + Math.cos(ta) * tr * .5, cy + Math.sin(ta) * tr * .5); c.quadraticCurveTo(cx + Math.cos(ta) * tr * .7, cy + Math.sin(ta) * tr * .9 + r * .2, cx + Math.cos(ta) * tr * .75, cy + Math.sin(ta) * tr + r * .3); c.stroke();
    c.restore();
  }
  function buildStatic() {
    floorStones = 0; cobwebs = 0; dripSources = [];
    seed = 1337;
    staticCv = document.createElement("canvas"); staticCv.width = W * DPR; staticCv.height = H * DPR;
    const c = staticCv.getContext("2d"); c.scale(DPR, DPR);
    // vault / void
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#04050b"); sky.addColorStop(.42, "#141a33"); sky.addColorStop(.62, "#0b0e1c"); sky.addColorStop(1, "#05060c");
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    // distant hall: a dim blue glow through receding arches
    const [dx, dy] = proj(0, .1, ZMAX);
    let g = c.createRadialGradient(dx, dy, 0, dx, dy, F * 2.6 / ZMAX * 6);
    g.addColorStop(0, "rgba(90,125,200,.6)"); g.addColorStop(.25, "rgba(50,72,140,.35)"); g.addColorStop(1, "rgba(20,28,64,0)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const dw = 0.55 * F / ZMAX, dh = 1.5 * F / ZMAX;
    c.fillStyle = "rgba(78,108,175,.55)"; c.beginPath(); c.moveTo(dx - dw, dy + dh * .55); c.lineTo(dx - dw, dy - dh * .25); c.arc(dx, dy - dh * .25, dw, Math.PI, 0); c.lineTo(dx + dw, dy + dh * .55); c.fill();
    // one more arch beyond the last, fading into the blue
    { const za = ZMAX - 3; c.strokeStyle = "rgba(8,10,20,.55)"; c.lineWidth = Math.max(1, .22 * F / za); c.beginPath(); c.moveTo(...proj(WALL - .2, FLOOR, za)); for (let a = 0; a <= 24; a++) { const t = Math.PI * a / 24; c.lineTo(...proj(Math.cos(t) * (WALL - .2), SPRING + .1 + Math.sin(t) * 1.05, za)); } c.lineTo(...proj(-WALL + .2, FLOOR, za)); c.stroke(); }
    // ceiling vault between arches
    for (let i = ARCH_Z.length - 1; i >= 0; i--) {
      const z = ARCH_Z[i], z2 = i ? ARCH_Z[i - 1] : .6;
      for (let a = 0; a < 18; a++) {
        const t0 = Math.PI * a / 18, t1 = Math.PI * (a + 1) / 18;
        const p = (t, zz) => proj(Math.cos(t) * WALL, SPRING + Math.sin(t) * 1.15, zz);
        const vc = shade([44, 50, 66], Math.cos(t0) * WALL, SPRING + 1, (z + z2) / 2);
        mortar(c, [p(t0, z), p(t1, z), p(t1, z2), p(t0, z2)], vc);
        const span = z - z2, n = 4, off = (a % 2) * span / n / 2;
        for (let k = 0; k <= n; k++) {
          const za = Math.min(z, z2 + off + span * k / n), zb = Math.max(z2, z2 + off + span * (k - 1) / n);
          if (za - zb < .05) continue;
          stone(c, [p(t0, za), p(t1, za), p(t1, zb), p(t0, zb)], shade([44, 50, 66], Math.cos(t0) * WALL, SPRING + 1, (za + zb) / 2), { round: .3, lit: .08 });
        }
      }
    }
    // walls: stone blocks
    for (const side of [-1, 1]) {
      const x = side * WALL;
      mortar(c, [proj(x, FLOOR, ZMAX), proj(x, SPRING, ZMAX), proj(x, SPRING, .6), proj(x, FLOOR, .6)], shade([44, 50, 64], x, 0, 6));
      for (let y = FLOOR; y < SPRING;) {
        const h = .18 + srand() * .24, y1 = Math.min(SPRING, y + h);
        for (let z = ZMAX - srand() * .5; z > .6;) {
          const len = .35 + srand() * .75, za = Math.max(.6, z - len);
          const v = 48 + srand() * 26, base = [v * .88, v * 1.0, v * 1.3];
          const pts = [proj(x, y, z), proj(x, y1, z), proj(x, y1, za), proj(x, y, za)];
          stone(c, pts, shade(base, x, (y + y1) / 2, (za + z) / 2), { round: .14, rough: .8, chips: true });
          z = za;
        }
        y = y1;
      }
    }
    // floor: large, flat, uneven flagstones, wet down the middle
    mortar(c, [proj(-WALL, FLOOR, ZMAX), proj(WALL, FLOOR, ZMAX), proj(WALL, FLOOR, .55), proj(-WALL, FLOOR, .55)], shade([42, 48, 62], 0, FLOOR, 5));
    for (let z = ZMAX; z > .55;) {
      const d = .45 + srand() * .35, z0 = Math.max(.55, z - d);
      let x = -WALL - srand() * .3;
      while (x < WALL) {
        const w = .5 + srand() * .7, x1 = Math.min(WALL, x + w), xa = Math.max(-WALL, x);
        const v = 44 + srand() * 26, base = [v * .92, v * .97, v * 1.12];
        const wet = Math.max(0, .55 - Math.abs((xa + x1) / 2) * .45) * (.4 + srand() * .6);
        const inset = .012;
        const pts = [proj(xa + inset, FLOOR, z0 + inset), proj(x1 - inset, FLOOR, z0 + inset), proj(x1 - inset, FLOOR, z - inset), proj(xa + inset, FLOOR, z - inset)];
        floorStones++; stone(c, pts, shade(base, (xa + x1) / 2, FLOOR, (z + z0) / 2, wet), { round: .1, bulge: .02, rough: .5, mortar: .05, wet, lit: .05 });
        x = x1;
      }
      z = z0;
    }
    // pillars, arches, clay pots, torch sconces — far to near
    for (let i = ARCH_Z.length - 1; i >= 0; i--) {
      const z = ARCH_Z[i], s = F / z;
      for (const side of [-1, 1]) {
        const xo = side * WALL, xi = side * (WALL - .32);
        // pillar front face and inner side
        const pf = shade([54, 60, 80], xi, 0, z + .3), ps2 = shade([68, 76, 98], (xo + xi) / 2, 0, z - .3);
        mortar(c, [proj(xi, FLOOR, z - .3), proj(xi, SPRING + .1, z - .3), proj(xi, SPRING + .1, z + .3), proj(xi, FLOOR, z + .3)], pf);
        mortar(c, [proj(xo, FLOOR, z - .3), proj(xo, SPRING + .1, z - .3), proj(xi, SPRING + .1, z - .3), proj(xi, FLOOR, z - .3)], ps2);
        // dressed pillar blocks, alternating long and short so the joints stagger
        for (let y = FLOOR, k = 0; y < SPRING + .1; k++) {
          const y1 = Math.min(SPRING + .1, y + .3);
          const zs = k % 2 ? [z - .3, z + .05, z + .3] : [z - .3, z - .05, z + .3];
          for (let q = 0; q < 2; q++) stone(c, [proj(xi, y, zs[q]), proj(xi, y1, zs[q]), proj(xi, y1, zs[q + 1]), proj(xi, y, zs[q + 1])], shade([54, 60, 80], xi, (y + y1) / 2, zs[q + 1]), { round: .14, rough: .5, chips: true, mortar: .07 });
          stone(c, [proj(xo, y, z - .3), proj(xo, y1, z - .3), proj(xi, y1, z - .3), proj(xi, y, z - .3)], shade([68, 76, 98], (xo + xi) / 2, (y + y1) / 2, z - .3), { round: .14, rough: .5, chips: true, mortar: .07 });
          y = y1;
        }
      }
      // arch rib
      c.lineWidth = .3 * s; c.strokeStyle = shade([66, 66, 80], 0, SPRING + 1, z - .3);
      c.beginPath(); for (let a = 0; a <= 30; a++) { const t = Math.PI * a / 30, [px, py] = proj(Math.cos(t) * (WALL - .16), SPRING + .1 + Math.sin(t) * 1.05, z - .3); a ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
      c.lineWidth = Math.max(.6, s * .015); c.strokeStyle = "rgba(0,0,0,.55)";
      for (let a = 1; a < 9; a++) { const t = Math.PI * a / 9; c.beginPath(); c.moveTo(...proj(Math.cos(t) * (WALL - .01), SPRING + .1 + Math.sin(t) * 1.2, z - .3)); c.lineTo(...proj(Math.cos(t) * (WALL - .32), SPRING + .1 + Math.sin(t) * .9, z - .3)); c.stroke(); }
      // hanging chandelier every other arch
      if (i % 2 === 1 && i < 6) {
        const [hx, hy] = proj(0, SPRING + .5, z - .3), [, top] = proj(0, SPRING + 1.15, z - .3);
        c.strokeStyle = "rgba(10,10,14,.9)"; c.lineWidth = Math.max(.6, s * .012);
        c.beginPath(); c.moveTo(hx, top); c.lineTo(hx, hy); c.stroke();
        c.lineWidth = Math.max(1, s * .03); c.beginPath(); c.ellipse(hx, hy, .38 * s, .07 * s, 0, 0, Math.PI * 2); c.stroke();
        for (const ox of [-.3, -.1, .1, .3]) { c.beginPath(); c.moveTo(hx, hy - .25 * s); c.lineTo(hx + ox * s, hy); c.stroke(); }
      }
    }
    // iron braziers on tripod stands; flames are animated on top in their bowls
    torches = [];
    TORCH_Z.forEach((z, i) => [-1, 1].forEach(side => {
      const wx = side * (WALL - .62), s = F / z, [tx, ty, bowlW] = drawBrazier(c, wx, z, s, side);
      torches.push({ x: tx, y: ty, s, z, side, wx, bowlW, kind: "brazier", flame: s > 18 ? new Flame(Math.min(.65 * bowlW, .34 * s), 90) : null, ph: Math.random() * 10, fx: proj(wx, FLOOR, z)[0] });
    }));
    // cobwebs in the upper corners where the nearest arches spring from their pillars
    for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
      if (srand() < .25) continue;
      const z = ARCH_Z[i] - .3, [wx, wy] = proj(side * (WALL - .32), SPRING + .1, z);
      if (wx < -50 || wx > W + 50) continue;
      drawCobweb(c, wx, wy, .42 * F / z * (.8 + srand() * .4), side); cobwebs++;
    }
    // wet streaks down the walls; each one is also a spot where water can drip
    for (let k = 0; k < 7 && dripSources.length < 10; k++) for (const side of [-1, 1]) {
      const bay = (srand() * 4) | 0, z = ARCH_Z[bay] + .55 + srand() * (ARCH_Z[bay + 1] - ARCH_Z[bay] - 1.1), y0w = SPRING - .15 - srand() * .5;
      const [sx, sy] = proj(side * WALL, y0w, z), [, fy] = proj(side * WALL, FLOOR, z), s = F / z;
      if (srand() < .4 || sx < 8 || sx > W - 8) continue;
      const len = (y0w - FLOOR) * s * (.35 + srand() * .4), sg = c.createLinearGradient(0, sy, 0, sy + len);
      sg.addColorStop(0, "rgba(150,178,235,.16)"); sg.addColorStop(1, "rgba(150,178,235,0)");
      c.fillStyle = sg; c.fillRect(sx - Math.max(1, .012 * s), sy, Math.max(2, .024 * s), len);
      c.fillStyle = "rgba(210,225,255,.35)"; c.beginPath(); c.arc(sx, sy, Math.max(.8, .01 * s), 0, Math.PI * 2); c.fill();
      dripSources.push({ x: sx, y0: sy, yEnd: fy, s });
    }
    // chandelier candle points
    ARCH_Z.forEach((z, i) => { if (i % 2 === 1 && i < 6) { const s = F / (z - .3); [-.3, -.1, .1, .3].forEach(ox => { const [px, py] = proj(ox, SPRING + .5, z - .3); torches.push({ x: px, y: py - .03 * s, s: s * .35, z, small: true, ph: Math.random() * 10, flame: s > 30 ? new Flame(Math.min(10, .05 * s)) : null }); }); } });
    torches.sort((a, b) => b.z - a.z);
    // stone grain: mottled multiply pass so surfaces read as rough stone, not flat paint
    const nz = document.createElement("canvas"); nz.width = nz.height = 256; const nx = nz.getContext("2d");
    nx.fillStyle = "#fff"; nx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) { const rr = 8 + srand() * 30, px = srand() * 256, py = srand() * 256, v = 175 + srand() * 60 | 0; const gg = nx.createRadialGradient(px, py, 0, px, py, rr); gg.addColorStop(0, `rgba(${v},${v},${v},.35)`); gg.addColorStop(1, `rgba(${v},${v},${v},0)`); nx.fillStyle = gg; nx.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
    const id = nx.getImageData(0, 0, 256, 256), dd = id.data; for (let i = 0; i < dd.length; i += 4) { const n = (srand() - .5) * 46; dd[i] += n; dd[i + 1] += n; dd[i + 2] += n; } nx.putImageData(id, 0, 0);
    c.save(); c.globalCompositeOperation = "multiply"; c.fillStyle = c.createPattern(nz, "repeat"); c.fillRect(0, 0, W, H); c.restore();
    // darken the vault overhead, as in a real torchlit hall
    g = c.createLinearGradient(0, 0, 0, CY);
    g.addColorStop(0, "rgba(2,3,8,.82)"); g.addColorStop(.7, "rgba(2,3,8,.25)"); g.addColorStop(1, "rgba(2,3,8,0)");
    c.fillStyle = g; c.fillRect(0, 0, W, CY);
    // edge vignette
    g = c.createRadialGradient(CX, CY, Math.min(W, H) * .2, CX, CY, Math.max(W, H) * .75);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.6)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // the bright doorway mirrored in the wet floor
    { c.save(); c.globalCompositeOperation = "lighter";
      for (let z = ZMAX * .7; z > 1.6; z *= .9) {
        const [rx, ry] = proj(0, FLOOR, z), w = F / z * (.16 + (1 - z / ZMAX) * .1), a = .05 * (1 - Math.min(1, 2.2 / z) * .6);
        const rg = c.createRadialGradient(rx, ry, 0, rx, ry, w * 2); rg.addColorStop(0, `rgba(90,120,200,${a * .6})`); rg.addColorStop(1, "rgba(70,95,180,0)");
        c.fillStyle = rg; c.save(); c.translate(rx, ry); c.scale(1, .5); c.translate(-rx, -ry); c.fillRect(rx - w * 2, ry - w * 2, w * 4, w * 4); c.restore();
      }
      c.restore(); }
    // mist low over the floor
    g = c.createLinearGradient(0, CY + H * .05, 0, H);
    g.addColorStop(0, "rgba(70,90,160,0)"); g.addColorStop(.35, "rgba(70,90,160,.10)"); g.addColorStop(1, "rgba(20,24,50,.25)");
    c.fillStyle = g; c.fillRect(0, CY, W, H - CY);
  }
  function resize() {
    W = innerWidth; H = innerHeight; DPR = COARSE ? 1 : Math.min(1.5, window.devicePixelRatio || 1); /* a dim backdrop: phones draw it at normal resolution */
    cv.width = W * DPR; cv.height = H * DPR;
    F = Math.max(W, H * 1.3) * .5; CX = W / 2; CY = H * .44;
    drips = []; buildStatic(); draw(0);
  }
  function draw(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(staticCv, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const t = performance.now() / 1000;
    ctx.globalCompositeOperation = "lighter";
    for (const T of torches) {
      const fl = .82 + Math.sin(t * 7.3 + T.ph) * .07 + Math.sin(t * 13.1 + T.ph * 2) * .05 + Math.sin(t * 2.1 + T.ph) * .06;
      const fade = Math.exp(-T.z / 16);
      // halo on the wall around the torch
      const R = (T.small ? .7 : .95) * T.s * fl;
      ctx.globalAlpha = (T.small ? .3 : .5) * fade + .05;
      ctx.drawImage(GLOW, T.x - R, T.y - R * 1.05, R * 2, R * 2);
      if (!T.small) {
        // wet floor reflection: a long warm streak under the torch
        const fy = proj(0, FLOOR, T.z)[1], fx = T.fx + (CX - T.fx) * .12;
        ctx.globalAlpha = .5 * fade * fl;
        ctx.drawImage(GLOW, fx - .35 * T.s, fy - .1 * T.s, .7 * T.s, 1.6 * T.s);
      }
      if (T.flame) { T.flame.update(Math.min(.05, dt)); T.flame.draw(ctx, T.x, T.y - (T.small ? 0 : .02 * T.s), 1); }
      else { const r = (T.small ? .07 : .16) * T.s * fl; ctx.globalAlpha = .95; ctx.drawImage(SPR[1], T.x - r * .7, T.y - r * 2, r * 1.4, r * 2.4); ctx.globalAlpha = .6; ctx.drawImage(SPR[4], T.x - r, T.y - r * 2.4, r * 2, r * 3); }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    drawDrips(Math.min(.05, dt));
  }
  function drawDrips(dt) {
    // water: a drop swells at a wet streak, falls, and splashes on the flagstones (never more than 4 at once)
    if (!reduce && dt > 0) for (const S of dripSources) if (drips.length < 4 && Math.random() < dt / (3 * dripSources.length)) drips.push({ x: S.x, y: S.y0, y0: S.y0, yEnd: S.yEnd, s: S.s, vy: 0, phase: 0, t: 0 });
    for (let i = drips.length - 1; i >= 0; i--) {
      const D = drips[i]; D.t += dt;
      if (D.phase === 0 && D.t > .7) { D.phase = 1; D.t = 0; }
      if (D.phase === 1) { D.vy += 9.8 * D.s * dt; D.y += D.vy * dt; if (D.y >= D.yEnd) { D.y = D.yEnd; D.phase = 2; D.t = 0; } }
      if (D.phase === 2 && D.t > .35) { drips.splice(i, 1); continue; }
      const r = Math.max(.8, .011 * D.s);
      if (D.phase === 0) { ctx.fillStyle = "rgba(200,220,255,.75)"; ctx.beginPath(); ctx.ellipse(D.x, D.y0 + r * D.t, r * .8, r * (.6 + D.t), 0, 0, Math.PI * 2); ctx.fill(); }
      else if (D.phase === 1) { ctx.strokeStyle = "rgba(200,220,255,.7)"; ctx.lineWidth = r * 1.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(D.x, Math.max(D.y0, D.y - Math.min(D.vy * .04, 6 * r))); ctx.lineTo(D.x, D.y); ctx.stroke(); }
      else { const k = D.t / .35; ctx.strokeStyle = `rgba(190,210,255,${.5 * (1 - k)})`; ctx.lineWidth = Math.max(.6, r * .5); ctx.beginPath(); ctx.ellipse(D.x, D.yEnd, r * (1 + k * 6), r * (.4 + k * 2), 0, 0, Math.PI * 2); ctx.stroke(); }
    }
  }

  /* ---------- header torches ---------- */
  const heads = [...document.querySelectorAll("header .torch")].map(sp => {
    const c = document.createElement("canvas"); c.className = "flame-cv"; c.width = 140; c.height = 160; sp.appendChild(c);
    const x = c.getContext("2d"); x.scale(2, 2); return { x, f: new Flame(23, 130) };
  });

  /* The scene is redrawn at most 30 times a second (20 on phones), not at the screen's 60+: flames look the same and it
     saves battery. The header torches are skipped while the header is scrolled away (hdr-away on phones). */
  const FRAME_MS = COARSE ? 50 : 33;
  let last = performance.now(), running = !reduce;
  function loop(now) {
    if (running && now - last < FRAME_MS - 2) { requestAnimationFrame(loop); return; }
    const dt = Math.min(.06, (now - last) / 1000); last = now;
    draw(dt);
    if (!document.documentElement.classList.contains("hdr-away")) for (const h of heads) { h.x.clearRect(0, 0, 70, 80); h.f.update(dt); h.f.draw(h.x, 35, 72, 1); }
    if (running) requestAnimationFrame(loop);
  }
  addEventListener("resize", () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); });
  document.addEventListener("visibilitychange", () => { if (reduce) return; if (document.hidden) running = false; else if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } });
  // read-only view of scene state, used by the automated background checks
  Object.defineProperty(window, "__forgeBg", { configurable: true, get: () => ({ torches, drips, dripSources, floorStones, cobwebs, W, H, F, project: proj, draw }) });
  resize();
  if (reduce) { for (let i = 0; i < 40; i++) { heads.forEach(h => h.f.update(.03)); torches.forEach(T => T.flame && T.flame.update(.03)); } loop(performance.now()); }
  else requestAnimationFrame(loop);
})();
