/* 15-torch.js: Live torchlight on the background picture, and the header torches. */

/* ======================= Torchlight on the corridor picture + realistic flames ======================= */
(function () {
  "use strict";
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COARSE = window.matchMedia && matchMedia("(pointer: coarse)").matches; /* phones and tablets */
  const rand = (a, b) => a + Math.random() * (b - a);

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

  /* ---------- the background picture's torches ----------
     The corridor is a picture (src/backdrop/, shown by #bgScene's CSS as a "50% 50% / cover" background). This canvas,
     on top of it and otherwise see-through, draws live flames and a flickering glow on the picture's torches.
     Torch positions are fractions of the picture's width and height, measured from the picture: change them here
     when a picture is swapped (see tools/make-backdrop.py). */
  const BACKDROPS = {
    wide: { w: 2560, h: 1429, torches: [{ x: .284, y: .322 }, { x: .716, y: .322 }] },   /* laptops, TVs, phones on their side */
    tall: { w: 1080, h: 1935, torches: [{ x: .179, y: .392 }, { x: .824, y: .392 }] },   /* phones held upright */
  };
  const TALL_MQ = "(max-aspect-ratio: 3/4)"; /* the same query as the tall picture's CSS */
  const sceneName = () => BACKDROPS.tall && matchMedia(TALL_MQ).matches ? "tall" : "wide";
  function coverBox(pic, W, H) {
    const s = Math.max(W / pic.w, H / pic.h);
    return { s, ox: (W - pic.w * s) / 2, oy: (H - pic.h * s) / 2 };
  }
  const cv = document.createElement("canvas"); cv.id = "bgScene"; cv.setAttribute("aria-hidden", "true");
  document.body.prepend(cv);
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1, scene = "wide", torches = [], frames = 0;
  function resize() {
    W = innerWidth; H = innerHeight; DPR = COARSE ? 1 : Math.min(1.5, window.devicePixelRatio || 1); /* phones draw at normal resolution */
    cv.width = W * DPR; cv.height = H * DPR;
    scene = sceneName();
    const pic = BACKDROPS[scene], { s, ox, oy } = coverBox(pic, W, H);
    torches = pic.torches.map(t => ({ x: ox + t.x * pic.w * s, y: oy + t.y * pic.h * s, size: .034 * pic.h * s }))
      .filter(T => T.x >= 0 && T.x <= W && T.y >= 0 && T.y <= H)
      .map(T => Object.assign(T, { ph: Math.random() * 10, flame: new Flame(T.size) }));
    if (reduce) ctx.clearRect(0, 0, cv.width, cv.height); /* the still picture only */
    else draw(0);
  }
  function draw(dt) {
    frames++;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const t = performance.now() / 1000;
    for (const T of torches) {
      const fl = .82 + Math.sin(t * 7.3 + T.ph) * .07 + Math.sin(t * 13.1 + T.ph * 2) * .05 + Math.sin(t * 2.1 + T.ph) * .06;
      /* the glow on the stone around the torch breathes with the flame */
      const R = 4.5 * T.size * fl;
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .35 * fl;
      ctx.drawImage(GLOW, T.x - R, T.y - R * 1.15, R * 2, R * 2);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      T.flame.update(Math.min(.05, dt)); T.flame.draw(ctx, T.x, T.y, 1);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
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
    if (!reduce) draw(dt);
    if (!document.documentElement.classList.contains("hdr-away")) for (const h of heads) { h.x.clearRect(0, 0, 70, 80); h.f.update(dt); h.f.draw(h.x, 35, 72, 1); }
    if (running) requestAnimationFrame(loop);
  }
  addEventListener("resize", () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); });
  document.addEventListener("visibilitychange", () => { if (reduce) return; if (document.hidden) running = false; else if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } });
  // read-only view of scene state, used by the automated background checks
  Object.defineProperty(window, "__forgeBg", { configurable: true, get: () => ({ scene, torches, W, H, frames, draw }) });
  resize();
  if (reduce) { for (let i = 0; i < 40; i++) { heads.forEach(h => h.f.update(.03)); } loop(performance.now()); }
  else requestAnimationFrame(loop);
})();
