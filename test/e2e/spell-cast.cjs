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
    c.prepared = [{ n: "Cure Wounds", l: 1, ed: "2014" }, { n: "Sacred Flame", l: 0, ed: "2014" }, { n: "Spiritual Weapon", l: 2, ed: "2014" }, { n: "Bless", l: 1, ed: "2014" }, { n: "Spirit Guardians", l: 3, ed: "2014" }];
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
    const sec = await p.evaluate(() => { const s = document.querySelector("#sec-spells"), a = document.querySelector("#sec-attacks"); return { slots: !!(s && s.querySelector(".slots [data-use]")), dc: !!(s && /Spell save DC/.test(s.textContent)), browse: !!(s && s.querySelector("[data-spells]")), atkSlots: !!(a && a.querySelector(".slots")), atkTitle: a && a.querySelector("h3").textContent }; });
    check("the slot tracker, spell DC and Browse are in the Spells box", sec.slots && sec.dc && sec.browse, JSON.stringify(sec));
    check("the Attacks box keeps just attacks", !sec.atkSlots && sec.atkTitle === "Attacks", JSON.stringify(sec));
    check("each level shows its slots left", await p.evaluate(() => /4 of 4 slots left/.test(document.querySelector("#rcPrepared").textContent) && /3 of 3 slots left/.test(document.querySelector("#rcPrepared").textContent)));
    await p.click(bubble("Cure Wounds")); await p.waitForTimeout(200);
    const w = await p.evaluate(() => { const m = document.querySelector("#actModal.open"); if (!m) return null; const r = m.querySelector(".spell-rules"); const b = s => m.querySelector(`[data-castlv="${s}"]`); return { rules: r && r.offsetParent && /touch/i.test(r.textContent), l1: b("slot1") && b("slot1").getAttribute("aria-pressed"), l2: b("slot2") && b("slot2").textContent.trim(), l3dis: b("slot3") && b("slot3").disabled, fx: (m.querySelector("#castFx") || {}).textContent || "" }; });
    check("tapping a bubble opens the full rules", w && w.rules, JSON.stringify(w));    check("the window's wording doesn't repeat 'level'", await p.evaluate(() => !/level[- ]level/i.test(document.querySelector("#actModal").textContent)));
    check("the lowest level with a slot is picked first", w && w.l1 === "true");
    check("a level button shows its slots left", w && /2nd/.test(w.l2) && /3 left/.test(w.l2), w && w.l2);
    check("a used-up level is greyed out", w && w.l3dis === true);
    check("the effect line shows the dice at the picked level", w && /1d8/.test(w.fx), w && w.fx);
    await p.click('#actModal [data-castlv="slot2"]'); await p.waitForTimeout(100);
    check("picking a higher level changes the dice", /2d8/.test(await p.locator("#castFx").textContent()), await p.locator("#castFx").textContent());
    await p.click("#actModal [data-castgo]"); await p.waitForTimeout(300);
    check("Cast spends the picked level's slot", await p.evaluate(id => { const c = PCS.roster.find(x => x.id === id); return (+c.used.slot2 || 0) === 1 && !(+c.used.slot1 || 0); }, id));
    await p.evaluate(() => actClose());
    // every slot that fits is used up: nothing is picked, and Cast waits for a choice
    await p.evaluate(id => { const c = PCS.roster.find(x => x.id === id); c.used = { slot3: 2 }; renderRosterTab(); }, id); await p.waitForTimeout(200);
    await p.click(bubble("Spirit Guardians")).catch(() => {});
    const none = await p.evaluate(() => { const m = document.querySelector("#actModal.open"); if (!m) return null; return { picked: [...m.querySelectorAll('[data-castlv][aria-pressed="true"]')].map(b => b.dataset.castlv), cast: m.querySelector("[data-castgo]").disabled, fx: m.querySelector("#castFx").textContent }; });
    check("with no slots left, nothing is picked and Cast waits for a choice", none && !none.picked.length && none.cast && /No slots left/.test(none.fx), JSON.stringify(none));
    await p.click('#actModal [data-castlv="free"]'); await p.waitForTimeout(100);
    check("…choosing Without a slot then allows Cast", await p.evaluate(() => !document.querySelector("#actModal [data-castgo]").disabled));
    check("the spell window is wider than other pop-ups", await p.evaluate(() => document.querySelector("#actModal .box").getBoundingClientRect().width > 560));
    await p.evaluate(() => { actClose(); actDialog('<h3 id="actTitle">x</h3>'); });
    check("…and other pop-ups don't keep its width", await p.evaluate(() => !document.querySelector("#actBox").classList.contains("spell-box")));
    await p.evaluate(() => actClose()); await p.evaluate(() => renderRosterTab()); await p.waitForTimeout(200);
    await p.click(bubble("Sacred Flame")); await p.waitForTimeout(200);
    check("a cantrip has no slot buttons, and can be cast", await p.evaluate(() => !document.querySelector('#actModal [data-castlv^="slot"]') && !!document.querySelector("#actModal [data-castgo]")));
    await p.evaluate(() => actClose());
    await p.click('#rcPrepared [data-unprep="2014|Bless"]'); await p.waitForTimeout(200);
    check("the ✕ still removes a spell", await p.evaluate(id => !PCS.roster.find(x => x.id === id).prepared.some(s => s.n === "Bless"), id));
    // a non-caster's feat spells: no ✕ (the feat would bring them back)
    check("a non-caster's feat spells have no ✕", await p.evaluate(() => { const c = pcEnsure(generateCharacter({ seed: "MI1", cls: "Fighter", level: 2, ed: "2014" })); c.prepared = [{ n: "Fire Bolt", l: 0, ed: "2014", src: "Magic Initiate" }]; const h = preparedHTML(c, true); return /data-spell=/.test(h) && !/data-unprep=/.test(h); }));
    // a newly forged (unsaved) character uses the same sheet as saved ones (one Characters tab since 2026-11-19)
    await p.goto(URL + "#character"); await p.waitForTimeout(300);
    await p.evaluate(() => { currentPC = pcEnsure(generateCharacter({ seed: "CAST2", name: "Brother Tam", cls: "Cleric", level: 3, ed: "2014" })); currentPC.prepared = [{ n: "Cure Wounds", l: 1, ed: "2014" }]; renderPC(); });
    await p.waitForTimeout(200);
    check("a new character's sheet has the Spells box with DC and slots, not under Attacks", await p.evaluate(() => { const s = document.querySelector("#sec-spells"); return !!document.querySelector("#rosterMain .draft-bar") && !!s && /Spell save DC/.test(s.textContent) && /slot/i.test(s.textContent) && ![...document.querySelectorAll("#rosterMain h3")].some(h => /Spellcasting/.test(h.textContent)); }));
    await p.click(bubble("Cure Wounds")); await p.waitForTimeout(200);
    check("a new character's spell opens the window with Cast", await p.evaluate(() => { const m = document.querySelector("#actModal.open"); return !!m && !!m.querySelector(".spell-rules") && !!m.querySelector("[data-castgo]"); }));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(375, 812, true);
    await p.goto(URL + "#roster"); await p.waitForTimeout(400);
    await setup(p); await p.evaluate(() => renderRosterTab()); await p.waitForTimeout(300);
    const h = await p.evaluate(s => Math.round(document.querySelector(s).getBoundingClientRect().height), bubble("Cure Wounds"));
    check("phone: bubbles are at least 44px tall", h >= 44, `${h}px`);
    await p.locator('.mobile-sheet-quick [data-jump="spells"]').tap();
    await p.locator(bubble("Cure Wounds")).tap();
    await p.waitForSelector("#actModal.open");
    check("phone: the spell window fits the screen width", await p.evaluate(() => { const b = document.querySelector("#actModal.open .box"); return !!b && b.getBoundingClientRect().right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth; }));
    await p.locator("#actModal [data-castgo]").tap();
    check("phone: casting after the spell shortcut spends the slot", await p.evaluate(() => rosterCur().used.slot1 === 1));
    await ctx.close();
  }
  // multiclass into a caster (owner's bug, 2026-11-18): a Fighter/Wizard prepares Wizard spells
  {
    const { ctx, p } = await open(1300, 900);
    await p.goto(URL + "#roster"); await p.waitForTimeout(400);
    const mc = await p.evaluate(() => {
      const fw = pcEnsure(generateCharacter({ seed: "MCF", name: "Gruff", cls: "Fighter", level: 3, ed: "2014", multi: [{ cls: "Wizard", lv: 2 }] }));
      const pool = pcSpellPool(fw, "2014").map(s => s.n);
      const cw = pcEnsure(generateCharacter({ seed: "MCC", cls: "Cleric", level: 3, ed: "2014", multi: [{ cls: "Wizard", lv: 1 }] }));
      const pool2 = pcSpellPool(cw, "2014").map(s => s.n);
      PCS.roster.push(fw); RC.id = fw.id; renderRosterTab();
      return { fwMM: pool.includes("Magic Missile"), fwFire: pool.includes("Fire Bolt"), fwBall: pool.includes("Fireball"), fwN: pool.length,
        cwSW: pool2.includes("Spiritual Weapon"), cwMM: pool2.includes("Magic Missile"), cwMisty: pool2.includes("Misty Step"),
        ph: (document.querySelector("#rcPrepQ") || {}).placeholder || "" };
    });
    check("a Fighter/Wizard can prepare Wizard spells and cantrips", mc.fwMM && mc.fwFire && !mc.fwBall, JSON.stringify(mc));
    check("a Cleric 3 / Wizard 1 gets both lists, each up to its own level", mc.cwSW && mc.cwMM && !mc.cwMisty, JSON.stringify(mc));
    check("the spell search names the casting class, not Fighter", /Wizard/.test(mc.ph) && !/Fighter/.test(mc.ph), mc.ph);
    const br = await p.evaluate(() => { const b = document.querySelector("#view-roster [data-spells]"); return b ? { d: b.dataset.spells, t: b.textContent } : null; });
    check("My Characters: Browse opens the Wizard list for a Fighter/Wizard", br && /^Wizard\|/.test(br.d) && /Wizard/.test(br.t) && !/Fighter/.test(br.t), JSON.stringify(br));
    const warn = await p.evaluate(() => { spLoad(); const fw = PCS.roster.find(x => x.id === RC.id); let said = ""; const old = toast; toast = m => { said += m + " | "; }; SP.target = fw.id; SP.ed = "2014"; try { spPrepToggle(SP.data["2014"].find(s => s.n === "Magic Missile")); } finally { toast = old; } return said; });
    check("Spells tab: preparing a Wizard spell for a Fighter/Wizard gives no wrong-list warning", !/isn't on the/.test(warn), warn);
    await ctx.close();
  }
  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll spell window checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
