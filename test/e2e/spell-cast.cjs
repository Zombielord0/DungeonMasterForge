// Spell bubbles and the spell window (2026-11-18). Run with:  npm run test:cast
// Starts its own static server for public/; uses the "Use without an account" mode.
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/json" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const errs = [];
  const open = async (w, h, phone) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: "block", reducedMotion: "reduce", ...(phone ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript(() => { localStorage.setItem("dmforge.offline", "1"); localStorage.setItem("dmforge.newsSeen", "9999"); });
    const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message)); return { ctx, p };
  };
  const setup = p => p.evaluate(() => {
    const c = pcEnsure(generateCharacter({ seed: "CAST1", name: "Sister Ana", cls: "Cleric", level: 5, ed: "2014" }));
    c.prepared = [{ n: "Cure Wounds", l: 1, ed: "2014" }, { n: "Sacred Flame", l: 0, ed: "2014" }, { n: "Spiritual Weapon", l: 2, ed: "2014" }, { n: "Bless", l: 1, ed: "2014" }];
    c.used = { slot3: 2 }; PCS.roster.push(c); pcPersist(); RC.id = c.id; return c.id;
  });
  const bubble = n => `#rcPrepared .prep-b[data-spell="2014|${n}"]`;

  {
    const { ctx, p } = await open(1300, 900);
    await p.goto(URL + "#roster"); await p.waitForTimeout(400);
    const id = await setup(p); await p.evaluate(() => renderRosterTab()); await p.waitForTimeout(300);
    check("spells show as bubbles, without the old ✦ button", await p.locator(bubble("Cure Wounds")).count() === 1 && await p.locator("#rcPrepared [data-cast]").count() === 0);
    check("bubbles look like bubbles (rounded, bordered, readable text)", await p.evaluate(s => { const cs = getComputedStyle(document.querySelector(s)); return parseFloat(cs.borderRadius) >= 12 && parseFloat(cs.borderTopWidth) >= 1 && parseFloat(cs.fontSize) >= 14; }, bubble("Cure Wounds")));
    check("a concentration spell's bubble is marked C", await p.locator(bubble("Bless") + " .prep-mk").textContent() === "C");
    check("each level shows its slots left", await p.evaluate(() => /4 of 4 slots left/.test(document.querySelector("#rcPrepared").textContent) && /3 of 3 slots left/.test(document.querySelector("#rcPrepared").textContent)));
    await p.click(bubble("Cure Wounds")); await p.waitForTimeout(200);
    const w = await p.evaluate(() => { const m = document.querySelector("#actModal.open"); if (!m) return null; const r = m.querySelector(".spell-rules"); const b = s => m.querySelector(`[data-castlv="${s}"]`); return { rules: r && r.offsetParent && /touch/i.test(r.textContent), l1: b("slot1") && b("slot1").getAttribute("aria-pressed"), l2: b("slot2") && b("slot2").textContent.trim(), l3dis: b("slot3") && b("slot3").disabled, fx: (m.querySelector("#castFx") || {}).textContent || "" }; });
    check("tapping a bubble opens the full rules", w && w.rules, JSON.stringify(w));
    check("the window's wording doesn't repeat 'level'", await p.evaluate(() => !/level[- ]level/i.test(document.querySelector("#actModal").textContent)));
    check("the lowest level with a slot is picked first", w && w.l1 === "true");
    check("a level button shows its slots left", w && /2nd/.test(w.l2) && /3 left/.test(w.l2), w && w.l2);
    check("a used-up level is greyed out", w && w.l3dis === true);
    check("the effect line shows the dice at the picked level", w && /1d8/.test(w.fx), w && w.fx);
    await p.click('#actModal [data-castlv="slot2"]'); await p.waitForTimeout(100);
    check("picking a higher level changes the dice", /2d8/.test(await p.locator("#castFx").textContent()), await p.locator("#castFx").textContent());
    await p.click("#actModal [data-castgo]"); await p.waitForTimeout(300);
    check("Cast spends the picked level's slot", await p.evaluate(id => { const c = PCS.roster.find(x => x.id === id); return (+c.used.slot2 || 0) === 1 && !(+c.used.slot1 || 0); }, id));
    await p.evaluate(() => actClose()); await p.evaluate(() => renderRosterTab()); await p.waitForTimeout(200);
    await p.click(bubble("Sacred Flame")); await p.waitForTimeout(200);
    check("a cantrip has no slot buttons, and can be cast", await p.evaluate(() => !document.querySelector('#actModal [data-castlv^="slot"]') && !!document.querySelector("#actModal [data-castgo]")));
    await p.evaluate(() => actClose());
    await p.click('#rcPrepared [data-unprep="2014|Bless"]'); await p.waitForTimeout(200);
    check("the ✕ still removes a spell", await p.evaluate(id => !PCS.roster.find(x => x.id === id).prepared.some(s => s.n === "Bless"), id));
    // the Characters tab: rules only
    await p.goto(URL + "#character"); await p.waitForTimeout(300);
    await p.evaluate(() => { currentPC = pcEnsure(generateCharacter({ seed: "CAST2", name: "Brother Tam", cls: "Cleric", level: 3, ed: "2014" })); currentPC.prepared = [{ n: "Cure Wounds", l: 1, ed: "2014" }]; renderPC(); });
    await p.waitForTimeout(200);
    await p.click('#pcPrepared .prep-b[data-spell="2014|Cure Wounds"]'); await p.waitForTimeout(200);
    check("on the Characters tab the window shows the rules without Cast", await p.evaluate(() => { const m = document.querySelector("#actModal.open"); return !!m && !!m.querySelector(".spell-rules") && !m.querySelector("[data-castgo]") && /Save to My characters/i.test(m.textContent); }));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(375, 812, true);
    await p.goto(URL + "#roster"); await p.waitForTimeout(400);
    await setup(p); await p.evaluate(() => renderRosterTab()); await p.waitForTimeout(300);
    const h = await p.evaluate(s => Math.round(document.querySelector(s).getBoundingClientRect().height), bubble("Cure Wounds"));
    check("phone: bubbles are at least 44px tall", h >= 44, `${h}px`);
    await p.locator(bubble("Cure Wounds")).scrollIntoViewIfNeeded(); await p.click(bubble("Cure Wounds")); await p.waitForTimeout(200);
    check("phone: the spell window fits the screen width", await p.evaluate(() => { const b = document.querySelector("#actModal.open .box"); return !!b && b.getBoundingClientRect().right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth; }));
    await ctx.close();
  }
  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll spell window checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
