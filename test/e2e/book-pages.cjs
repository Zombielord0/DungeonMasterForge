// Rulebook parchment (2026-11-23): generated adventures, NPC cards and forged monsters are on the yellowed, mottled
// paper with readable ink; spells, items, the Monster Manual, the character sheet and the Journal stay stone but use the
// book font (EB Garamond). Run with:  npm run test:book
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});
const PARCH = "#genOut>.card:not(.empty),#genOut>.sec,#npcOut .npc-card,#fgOut.fg-monster .card,#fgOut.fg-monster .sec,#mbPreview";
const STONE = "#spList>.sec,#itList>.sec,#bsList>.sec,#rosterMain>.sec,#journalMain";
/* For each area: is it on the new paper (its mottling layer, baseFrequency .007), its font, and which text on the paper
   is too light to read (under 4.5:1 against the paper where it's stained). Stone .btn buttons and own pictures are skipped. */
const probe = sel => {
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const lumOf = ([r, g, b]) => [r, g, b].map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const PAPER = [205, 175, 122], roots = [...document.querySelectorAll(sel)], faint = [];
  const isPaper = el => /baseFrequency='\.007'/.test(getComputedStyle(el).backgroundImage);
  const behind = (el, root) => {
    let col = PAPER; const tints = [];
    for (let a = el; a && a !== root; a = a.parentElement) {
      const st = getComputedStyle(a), [r, g, b, al = 1] = rgb(st.backgroundColor);
      if (st.backgroundImage !== "none" && !isPaper(a)) return null;
      if (al >= .9) { col = [r, g, b]; break; }
      if (al > 0) tints.unshift([r, g, b, al]);
    }
    for (const [r, g, b, al] of tints) col = [r * al + col[0] * (1 - al), g * al + col[1] * (1 - al), b * al + col[2] * (1 - al)];
    return col;
  };
  for (const root of roots.filter(isPaper)) for (const el of root.querySelectorAll("*")) {
    if (el.closest(".btn,select,input,textarea") || !el.getClientRects().length) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const st = getComputedStyle(el); if (+st.opacity < 1 || st.visibility === "hidden") continue;
    const bg = behind(el, root); if (!bg) continue;
    const [r, g, b, al = 1] = rgb(st.color), fg = [r * al + bg[0] * (1 - al), g * al + bg[1] * (1 - al), b * al + bg[2] * (1 - al)];
    const L1 = lumOf(fg), L2 = lumOf(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    if (ratio < 4.5) faint.push(`${el.className || el.tagName} «${el.textContent.trim().slice(0, 24)}» ${st.color} ${ratio.toFixed(1)}`);
  }
  return { roots: roots.length, onPaper: roots.filter(isPaper).length, garamond: roots.filter(r => /EB Garamond/.test(getComputedStyle(r).fontFamily)).length, faint: [...new Set(faint)].slice(0, 8) };
};

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  for (const [w, h, size] of [[1400, 1000, "laptop"], [390, 844, "phone"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: "block" });
    await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    const p = await ctx.newPage(), errs = []; p.on("pageerror", e => errs.push(e.message));

    // parchment: a generated adventure, NPCs, a forged monster
    await p.goto(URL + "#generate"); await p.click("#genForm button[type=submit]"); await p.waitForTimeout(700);
    let r = await p.evaluate(probe, PARCH);
    check(`${size}: a generated adventure is on the rulebook parchment, in the book font, readable`, r.roots > 0 && r.onPaper === r.roots && r.garamond === r.roots && !r.faint.length, JSON.stringify(r));
    const head = await p.evaluate(() => { const t = document.querySelector("#genOut .gen-title"); const st = getComputedStyle(t); return { tt: st.textTransform, color: st.color }; });
    check(`${size}: its titles are steel-blue capitals`, head.tt === "uppercase" && head.color === "rgb(29, 59, 91)", JSON.stringify(head));
    await p.goto(URL + "#npc"); await p.click("#view-npc form button[type=submit]"); await p.waitForTimeout(600);
    r = await p.evaluate(probe, "#npcOut .npc-card");
    check(`${size}: NPC cards are on the parchment and readable`, r.roots > 0 && r.onPaper === r.roots && !r.faint.length, JSON.stringify(r));
    await p.goto(URL + "#monsters"); await p.click('label.opt:has(input[value="forge"])').catch(() => {}); await p.click("#fgForm button[type=submit]"); await p.waitForTimeout(700);
    r = await p.evaluate(probe, "#fgOut.fg-monster .card,#fgOut.fg-monster .sec,#fgOut .card");
    check(`${size}: a forged creature is on parchment (monsters) or crimson vellum (villains), readable`, r.roots > 0 && !r.faint.length, JSON.stringify(r));

    // stone, with the book font: spells, items, the Monster Manual, a character sheet, the Journal
    await p.goto(URL + "#spells"); await p.waitForFunction(() => document.querySelector("#spList .sp-row"));
    await p.goto(URL + "#items"); await p.waitForFunction(() => document.querySelector("#itList .sp-row"));
    await p.goto(URL + "#monsters"); await p.click('label.opt:has(input[value="srd"])'); await p.waitForFunction(() => document.querySelector("#bsList .sp-row"));
    await p.goto(URL + "#roster"); await p.waitForFunction(() => typeof generateCharacter === "function");
    await p.evaluate(() => { const c = generateCharacter({ cls: "Wizard", level: 5, ed: "2014", seed: "book-stone" }); c.id = "pc-book-stone"; PCS.roster.unshift(c); RC.id = c.id; renderRosterTab(); });
    await p.waitForTimeout(400);
    r = await p.evaluate(probe, STONE);
    check(`${size}: spells, items, the Monster Manual, the sheet and the Journal stay stone, in the book font`, r.roots >= 5 && r.onPaper === 0 && r.garamond === r.roots, JSON.stringify(r));
    check(`${size}: the page isn't wider than the screen`, await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1);

    check(`${size}: no page errors`, !errs.length, errs.join(" | "));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll rulebook parchment checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
