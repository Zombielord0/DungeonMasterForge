// The background: a corridor picture behind the app, with live flames on its torches. Run with:  npm run test:backdrop
// Checks: the picture shows as a cover background, the flames sit on the picture's torches at several window sizes and
// after a resize, phones get the tall picture (and switch on rotating), torches cropped off-screen get no flame, the old drawn corridor is gone, reduced motion draws nothing,
// the frame cap holds, a missing picture leaves the dark colour, and printing hides the background.
// Starts its own static server for public/ (no database).
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".webmanifest": "application/manifest+json" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});

// the pictures and where their torches are (fractions of width and height), measured from the pictures themselves
const PICS = { wide: { w: 2560, h: 1429, torches: [{ x: .284, y: .322 }, { x: .716, y: .322 }] }, tall: { w: 1080, h: 1935, torches: [{ x: .179, y: .392 }, { x: .824, y: .392 }] } };
function expected(pic, W, H) { // CSS "50% 50% / cover"
  const s = Math.max(W / pic.w, H / pic.h), ox = (W - pic.w * s) / 2, oy = (H - pic.h * s) / 2;
  return pic.torches.map(t => ({ x: ox + t.x * pic.w * s, y: oy + t.y * pic.h * s })).filter(p => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H);
}
const near = (a, b) => a.length === b.length && a.every((p, i) => Math.abs(p.x - b[i].x) <= 2 && Math.abs(p.y - b[i].y) <= 2);
// resize the window and wait until the scene has redone its torches (resizes are debounced), not a fixed sleep
const size = async (p, width, height) => { await p.setViewportSize({ width, height }); await p.waitForFunction(([w, h]) => window.__forgeBg.W === w && window.__forgeBg.H === h, [width, height], { timeout: 10000 }); };
const bg = p => p.evaluate(() => { const b = window.__forgeBg; return { scene: b.scene, W: b.W, H: b.H, frames: b.frames, torches: b.torches.map(t => ({ x: t.x, y: t.y })), keys: Object.keys(b) }; });

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const open = async (opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 850 }, ...opts });
    await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    const p = await ctx.newPage(), errs = []; p.on("pageerror", e => errs.push(e.message));
    return { ctx, p, errs };
  };
  const ready = p => p.waitForFunction(() => !!window.__forgeBg && typeof generateCharacter === "function");

  { // the picture, and flames on its torches
    const { ctx, p, errs } = await open();
    await p.goto(URL); await ready(p);
    const css = await p.evaluate(() => { const cs = getComputedStyle(document.getElementById("bgScene")); return { img: cs.backgroundImage, size: cs.backgroundSize }; });
    const m = css.img.match(/\/assets\/backdrop-wide\.\w+\.webp/);
    check("the corridor picture is the background, covering the window", !!m && css.size === "cover", JSON.stringify(css));
    const st = m ? await p.evaluate(u => fetch(u).then(r => r.status), m[0]) : 0;
    check("…and the picture loads", st === 200, String(st));
    for (const [w, h] of [[1366, 850], [1920, 1080], [1280, 1000]]) {
      await size(p, w, h);
      const b = await bg(p), want = expected(PICS.wide, w, h);
      check(`flames sit on the picture's torches at ${w} x ${h}`, b.scene === "wide" && near(b.torches, want), JSON.stringify({ got: b.torches, want }));
    }
    await size(p, 1366, 850);
    await size(p, 1000, 900);
    { const b = await bg(p); check("after a resize the flames move with the torches", near(b.torches, expected(PICS.wide, 1000, 900)), JSON.stringify(b.torches)); }
    await size(p, 3200, 600);
    { const b = await bg(p), want = expected(PICS.wide, 3200, 600); check(`torches cropped off-screen get no flame (expect ${want.length} of 2)`, want.length < 2 && near(b.torches, want), JSON.stringify(b.torches)); }
    for (const [w, h] of [[390, 844], [412, 915]]) {
      await size(p, w, h);
      const b = await bg(p), want = expected(PICS.tall, w, h), img = await p.evaluate(() => getComputedStyle(document.getElementById("bgScene")).backgroundImage);
      check(`a phone (${w} x ${h}) gets the tall picture, flames on its torches`, b.scene === "tall" && /\/assets\/backdrop-tall\.\w+\.webp/.test(img) && want.length === 2 && near(b.torches, want), JSON.stringify({ scene: b.scene, img, got: b.torches, want }));
    }
    await size(p, 844, 390);
    { const b = await bg(p), img = await p.evaluate(() => getComputedStyle(document.getElementById("bgScene")).backgroundImage);
      check("turning the phone sideways switches to the wide picture and its torches", b.scene === "wide" && img.includes("/assets/backdrop-wide.") && near(b.torches, expected(PICS.wide, 844, 390)), JSON.stringify({ scene: b.scene, got: b.torches })); }
    await size(p, 1366, 850);

    const b = await bg(p);
    check("the old drawn corridor is gone", !["drips", "dripSources", "cobwebs", "floorStones"].some(k => b.keys.includes(k)), b.keys.join(","));
    const alpha = await p.evaluate(() => { const c = document.getElementById("bgScene"), d = c.width / innerWidth; return c.getContext("2d").getImageData(Math.round(innerWidth / 2 * d), Math.round(innerHeight * .6 * d), 1, 1).data[3]; });
    check("the canvas is see-through away from the torches (the picture is underneath)", alpha === 0, String(alpha));
    const f0 = (await bg(p)).frames; await p.waitForTimeout(2000); const f1 = (await bg(p)).frames;
    check("the flames move, redrawn at most 30 times a second", f1 - f0 >= 4 && f1 - f0 <= 66, String(f1 - f0)); /* a busy machine draws fewer */
    await p.emulateMedia({ media: "print" });
    check("printing hides the background", await p.evaluate(() => getComputedStyle(document.getElementById("bgScene")).display === "none"));
    await p.emulateMedia({ media: "screen" });
    check("no page errors", errs.length === 0, errs.join(" | "));
    await ctx.close();
  }

  { // reduced motion: the still picture only
    const { ctx, p, errs } = await open({ reducedMotion: "reduce" });
    await p.goto(URL); await ready(p); await p.waitForTimeout(1000);
    const b = await bg(p), t = b.torches[0] || { x: 0, y: 0 };
    const alpha = await p.evaluate(([x, y]) => { const c = document.getElementById("bgScene"), d = c.width / innerWidth; return c.getContext("2d").getImageData(Math.round(x * d), Math.round(y * d - 5), 1, 1).data[3]; }, [t.x, t.y]);
    check("reduced motion: nothing is animated over the picture", b.frames <= 1 && alpha === 0 && b.torches.length === 2, JSON.stringify({ frames: b.frames, alpha }));
    check("reduced motion: no page errors", errs.length === 0, errs.join(" | "));
    await ctx.close();
  }

  { // the picture is missing or slow: dark colour, no errors
    const { ctx, p, errs } = await open();
    await ctx.route("**/backdrop-*.webp", r => r.fulfill({ status: 404, body: "" }));
    await p.goto(URL); await ready(p); await p.waitForTimeout(400);
    const col = await p.evaluate(() => getComputedStyle(document.getElementById("bgScene")).backgroundColor);
    check("with no picture the background stays dark", col === "rgb(6, 7, 14)", col);
    check("with no picture there are no page errors", errs.length === 0, errs.join(" | "));
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll background checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
