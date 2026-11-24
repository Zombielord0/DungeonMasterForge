// Phone, tablet and laptop layout: nothing hidden, nothing out of reach. Run with:  npm run test:layout
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public"), FIX = path.join(__dirname, "fixtures");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});
const TABS = ["generate", "npc", "monsters", "character", "roster", "spells", "feats", "items", "map", "tracker", "homebrew"];
const SIZES = { phone: { width: 390, height: 640, touch: true }, tablet: { width: 768, height: 1024, touch: true }, laptop: { width: 1366, height: 768, touch: false } };
// heights of small controls on a computer with a mouse, before this work (they must not change)
const MOUSE_H = { ".btn.sm": 27, ".icon-btn": 26, ".ctr-b": 26, ".cond": 27, "#spLevels .chip": 32 };
const TOUCH_SEL = [".btn.sm", ".icon-btn", ".ctr-b", ".cond", "#spLevels .chip"];

async function page(browser, size, URL) {
  const S = SIZES[size] || size;
  const ctx = await browser.newContext({ viewport: { width: S.width, height: S.height }, serviceWorkers: "block", hasTouch: !!S.touch, isMobile: !!S.touch });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const p = await ctx.newPage(); p.__errs = []; p.on("pageerror", e => p.__errs.push(e.message));
  await p.goto(URL + "#roster"); await p.waitForFunction(() => typeof renderRosterTab === "function");
  await p.evaluate(() => {
    const c = generateCharacter({ seed: "lay1", name: "Layla Test", cls: "Wizard", level: 5, ed: "2014" }); pcEnsure(c); PCS.roster = [c]; RC.id = c.id; pcPersist();
    const k = blankCampaign("Layout"); k.npcs = [{ id: "n1", name: "Aldric", role: "Innkeeper", attitude: "Friendly", notes: "" }]; Store.save(k); activeId = k.id; renderRosterTab();
  });
  await p.waitForTimeout(700);
  return { p, ctx };
}
const go = async (p, URL, tab) => { await p.goto(URL + "#" + tab); await p.waitForTimeout(400); };
// is the last visible button of an open window inside the screen, without scrolling the window?
const windowOk = p => p.evaluate(() => {
  const o = [...document.querySelectorAll("#modal, #backupModal, #impCharModal, #lvModal, #featModal, #choiceModal, #actModal, #newsPanel")].find(e => getComputedStyle(e).display !== "none" && (e.classList.contains("open") || e.id === "newsPanel" && !e.hidden));
  if (!o) return { ok: false, why: "no window open" };
  if (o.id === "newsPanel") { const r = o.getBoundingClientRect(); return { ok: r.top >= 0 && r.bottom <= innerHeight, why: `newsPanel at ${Math.round(r.top)}-${Math.round(r.bottom)} of ${innerHeight}, scrollY ${Math.round(scrollY)}, vv ${visualViewport ? Math.round(visualViewport.offsetTop) + "/" + visualViewport.scale : "-"}, html "${document.documentElement.className}", header ${Math.round(document.querySelector("header").getBoundingClientRect().top)}` }; }
  const btns = [...o.querySelectorAll("button")].filter(b => b.offsetParent && b.getBoundingClientRect().height > 0);
  const last = btns[btns.length - 1]; if (!last) return { ok: false, why: "no buttons" };
  const r = last.getBoundingClientRect();
  return { ok: r.top >= 0 && r.bottom <= innerHeight, why: `${o.id} "${last.textContent.trim().slice(0, 16)}" at ${Math.round(r.top)}-${Math.round(r.bottom)} of ${innerHeight}` };
});
const covered = p => p.evaluate(() => {
  const fixed = [...document.querySelectorAll("body *")].filter(e => { const cs = getComputedStyle(e); if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && r.height < innerHeight * .8 && e.id !== "bgScene"; });
  const hits = [];
  for (const f of fixed) {
    const fr = f.getBoundingClientRect();
    for (const e of document.querySelectorAll(".view.active button, .view.active a, .view.active input, .view.active select, .view.active textarea")) {
      if (!e.offsetParent || f.contains(e)) continue; const r = e.getBoundingClientRect();
      if (r.width && r.bottom > fr.top + 2 && r.top < fr.bottom - 2 && r.right > fr.left + 2 && r.left < fr.right - 2) hits.push(`${f.id || f.className} over ${e.tagName.toLowerCase()}${e.dataset && Object.keys(e.dataset)[0] ? "[" + Object.keys(e.dataset)[0] + "]" : ""}`);
    }
  }
  return hits;
});
const away = p => p.evaluate(() => document.documentElement.classList.contains("hdr-away"));

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();

  for (const size of ["phone", "tablet", "laptop"]) {
    const { p, ctx } = await page(browser, size, URL);
    // no sideways scrolling
    for (const t of TABS) { await go(p, URL, t); const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); check(`${size}: no sideways scrolling on #${t}`, over <= 0, `${over}px`); }
    const quickNav = p.locator("#mobileNav");
    check(`${size}: phone navigation is only visible on a phone`, await quickNav.isVisible() === (size === "phone"));
    if (size === "phone") {
      await quickNav.getByRole("link", { name: "Sheet" }).tap();
      await p.waitForURL("**/#roster");
      await p.waitForSelector("#mobileNav a[aria-current=page][href=\"#roster\"]");
      check("phone: Sheet is marked as the current page", await quickNav.getByRole("link", { name: "Sheet" }).getAttribute("aria-current") === "page");
      await quickNav.getByRole("button", { name: "More" }).tap();
      const menu = p.locator("#fside"); /* More opens the side menu from the left (2026-11-24) */
      check("phone: More shows tools available to this session", await menu.getByRole("link", { name: "Compendium" }).isVisible() && !(await menu.getByRole("link", { name: "Party" }).count()));
      await menu.getByRole("link", { name: "Compendium" }).tap();
      await p.waitForURL("**/#compendium");
      check("phone: choosing a tool closes More", !(await p.evaluate(() => document.documentElement.classList.contains("fside-open"))));
      await quickNav.getByRole("link", { name: "Sheet" }).tap();
      await p.waitForURL("**/#roster");

      const hp = p.locator("[data-quick-hp]");
      const oldHP = Number(await hp.inputValue());
      await hp.fill("0");
      await hp.press("Tab");
      check("phone: quick HP updates the sheet and applies unconsciousness", await p.evaluate(() => rosterCur().hpCur === 0 && rosterCur().conds.unconscious && $('[data-rf="hpCur"]').value === "0"));
      await hp.fill(String(oldHP));
      await hp.press("Tab");
      check("phone: healing with quick HP clears unconsciousness", await p.evaluate(() => !rosterCur().conds?.unconscious));
      await p.locator('[data-quick-roll^="atk:"]').tap();
      check("phone: quick attack uses the sheet's roll log", await p.evaluate(() => /attack$/i.test(rosterCur().rollLog[0].label)));

      await p.locator("#forgeBox > summary").tap();
      const form = await p.locator("#pcForm").boundingBox();
      check("phone: opening Forge brings its form into view and folds the saved list", form && form.y >= 0 && form.y < 280 && !(await p.locator("#rosterList").isVisible()));
      await p.selectOption("#pcClass", "Fighter");
      const dialog = p.locator("#characterReference");
      const close = dialog.getByRole("button", { name: "Close" });
      const box = await dialog.boundingBox();
      check("phone: class progression fills the phone width", box && Math.abs(box.width - 390) <= 1);
      await dialog.evaluate(el => { el.scrollTop = el.scrollHeight; });
      const button = await close.boundingBox();
      check("phone: progression Close stays visible after scrolling", button && button.y >= 0 && button.y + button.height <= 640);
      const next = dialog.getByRole("button", { name: /^Next/ });
      const nextBox = await next.boundingBox();
      check("phone: progression Next stays visible after scrolling", nextBox && nextBox.y >= 0 && nextBox.y + nextBox.height <= 640);
      await close.tap();
      check("phone: closing progression restores focus to the class picker", await p.evaluate(() => document.activeElement.id === "pcClass"));
      await p.locator("#forgeBox > summary").tap();
      await quickNav.getByRole("link", { name: "Encounter" }).tap();
      await p.waitForSelector('#campMain [data-sub="encounters"].on');
    }
    // windows show their buttons
    await go(p, URL, "roster");
    await p.click("#impCharBtn"); await p.setInputFiles("#impCharFile", path.join(FIX, "companion-zook.json")); await p.waitForFunction(() => /Matched/.test(document.querySelector("#impCharOut").textContent), null, { timeout: 15000 }).catch(() => { });
    let w = await windowOk(p); check(`${size}: Import window buttons are on screen`, w.ok, w.why); await p.click("#impCharCancel").catch(() => { }); await p.waitForTimeout(200);
    await p.click("[data-lvup]").catch(() => { }); await p.waitForTimeout(500);
    w = await windowOk(p); check(`${size}: Level up window buttons are on screen`, w.ok, w.why); await p.evaluate(() => { try { lvClose(); } catch { } }); await p.waitForTimeout(200);
    // a long level-up: choosing a subclass at Wizard 2
    await p.evaluate(() => { const c = generateCharacter({ seed: "lay2", name: "Long Pick", cls: "Wizard", level: 1, ed: "2014" }); pcEnsure(c); PCS.roster.push(c); RC.id = c.id; renderRosterTab(); }); await p.waitForTimeout(300);
    await p.click("[data-lvup]").catch(() => { }); await p.waitForTimeout(500);
    w = await p.evaluate(() => { const y = document.querySelector("#lvModal [data-lvyes]"); if (!y) return { ok: false, why: "no Level up button" }; const r = y.getBoundingClientRect(); return { ok: r.top >= 0 && r.bottom <= innerHeight, why: `Level up button at ${Math.round(r.top)}-${Math.round(r.bottom)} of ${innerHeight}` }; });
    check(`${size}: a long Level up window keeps its button on screen`, w.ok, w.why); await p.evaluate(() => { try { lvClose(); } catch { } PCS.roster = PCS.roster.filter(c => c.name !== "Long Pick"); RC.id = PCS.roster[0].id; renderRosterTab(); }); await p.waitForTimeout(200);
    await p.evaluate(() => backupOpen()); await p.waitForTimeout(200);
    w = await windowOk(p); check(`${size}: Backup window buttons are on screen`, w.ok, w.why); await p.evaluate(() => backupClose());
    await p.evaluate(() => { window.__cb = confirmBox("Delete entry?", "Remove “a very long name” from your campaign? This can't be undone.".repeat(6)); }); await p.waitForTimeout(200);
    w = await windowOk(p); check(`${size}: confirm window buttons are on screen`, w.ok, w.why); await p.click("#modalNo").catch(() => { });
    await p.evaluate(() => newsOpen(true)); await p.waitForTimeout(300);
    w = await windowOk(p); check(`${size}: What's new panel buttons are on screen`, w.ok, w.why); await p.evaluate(() => newsOpen(false));
    // the end of long pages isn't covered
    for (const t of ["roster", "spells", "tracker", "map", "items"]) {
      await go(p, URL, t); await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(350);
      const h = await covered(p); check(`${size}: end of #${t} isn't covered`, !h.length, h.slice(0, 3).join(", "));
    }
    // tap sizes
    await go(p, URL, "roster");
    const sizes = async () => p.evaluate(sels => Object.fromEntries(sels.map(s => [s, [...document.querySelectorAll(s)].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })])), TOUCH_SEL);
    const sz = await sizes(); await go(p, URL, "spells"); await p.evaluate(() => { const f = document.getElementById("spForm"); if (f) f.classList.add("filters-open"); }); Object.assign(sz, { "#spLevels .chip": (await sizes())["#spLevels .chip"] }); await p.evaluate(() => document.getElementById("spForm").classList.remove("filters-open"));
    for (const s of TOUCH_SEL) {
      const L = sz[s] || []; if (!L.length) { check(`${size}: ${s} found`, false, "none visible"); continue; }
      if (SIZES[size].touch) { const small = L.filter(([w, h]) => w < 40 || h < 40); check(`touch ${size}: ${s} is at least 40px`, !small.length, `${small.length}/${L.length} smaller, e.g. ${JSON.stringify(small[0])}`); }
      else { const hs = [...new Set(L.map(x => x[1]))]; check(`mouse: ${s} keeps its size`, hs.every(h => Math.abs(h - MOUSE_H[s]) <= 1), `heights ${hs.join(",")} (was ${MOUSE_H[s]})`); }
    }
    if (size === "phone") {
      // labels
      await go(p, URL, "roster");
      const fsz = await p.evaluate(() => [...document.querySelectorAll(".rc-grid label")].filter(e => e.offsetParent).map(e => parseFloat(getComputedStyle(e).fontSize)));
      check("phone: labels are at least 12.5px", fsz.length && fsz.every(f => f >= 12.5), JSON.stringify([...new Set(fsz)]));
      // the header steps aside
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(200);
      check("phone: header shows at the top", !(await away(p)));
      await p.mouse.wheel(0, 600); await p.waitForTimeout(400);
      check("phone: header hides on scroll-down", await away(p));
      await p.mouse.wheel(0, -10); await p.waitForTimeout(300);
      check("phone: header stays hidden on a 10px scroll-up", await away(p));
      await p.mouse.wheel(0, -60); await p.waitForTimeout(400);
      check("phone: header returns on scroll-up", !(await away(p)));
      await p.mouse.wheel(0, 500); await p.waitForTimeout(300);
      // a window opened while the header is hidden is still fully visible
      await p.click("#impCharBtn"); await p.waitForTimeout(300);
      w = await windowOk(p); check("phone: a window opened while scrolled is on screen", w.ok, w.why); await p.click("#impCharCancel");
      await p.evaluate(() => scrollTo(0, 400)); await p.waitForTimeout(200);
      await p.focus('#rosterMain [data-rf="notes"]'); await p.waitForTimeout(300);
      check("phone: header hides while typing", await away(p));
      await p.evaluate(() => document.activeElement.blur()); await p.mouse.wheel(0, -80); await p.waitForTimeout(400);
      check("phone: header returns after typing and scrolling up", !(await away(p)));
      await p.mouse.wheel(0, 600); await p.waitForTimeout(300);
      await p.evaluate(() => document.getElementById("hdrToggle").click()); await p.waitForTimeout(300);
      check("phone: Show tabs keeps the header open", !(await away(p)));
      await p.evaluate(() => document.getElementById("hdrToggle").click()); await p.waitForTimeout(200);
      // jump bar
      await go(p, URL, "roster"); await p.evaluate(() => scrollTo(0, 0));
      check("phone: My Characters has a jump bar", await p.$("#sheetJump") !== null);
      for (const j of ["hp", "attacks", "spells", "gear", "notes"]) {
        const a = await p.$(`#sheetJump a[data-jump="${j}"]`); if (!a) { check(`phone: jump bar goes to ${j}`, false, "no link"); continue; }
        await a.click(); await p.waitForTimeout(1500);
        const r = await p.evaluate(j => { const bar = document.getElementById("sheetJump").getBoundingClientRect(), t = document.getElementById("sec-" + j); if (!t) return null; const tr = t.getBoundingClientRect(), end = scrollY + innerHeight >= document.documentElement.scrollHeight - 2; return { gap: Math.round(tr.top - bar.bottom), end, onScreen: tr.top < innerHeight - 100 }; }, j);
        check(`phone: jump bar goes to ${j}`, r && r.gap >= -2 && (r.gap <= 120 || r.end && r.onScreen), JSON.stringify(r)); /* the last section can only scroll as far as the page ends */
      }
      // spells list first
      await go(p, URL, "spells");
      const sp = await p.evaluate(() => { const r = document.querySelector(".sp-row"); return { top: r ? Math.round(r.getBoundingClientRect().top + scrollY) : 99999, H: innerHeight, btn: !!document.getElementById("spFiltersBtn") }; });
      check("phone: spells list comes first", sp.top < sp.H * 1.5, JSON.stringify(sp));
      check("phone: a Filters button opens the filters", sp.btn && await p.evaluate(() => { const f = document.getElementById("spFilters"), was = getComputedStyle(f).display === "none"; document.getElementById("spFiltersBtn").click(); return was && getComputedStyle(f).display !== "none"; }));
    }
    if (size === "laptop") {
      await go(p, URL, "map"); await p.click("#mapGen").catch(() => { }); await p.waitForTimeout(800);
      const [tv] = await Promise.all([ctx.waitForEvent("page", { timeout: 5000 }).catch(() => null), p.click("#hostStart").catch(() => { })]);
      await p.bringToFront(); await p.waitForTimeout(800);
      for (const s of ["#fogTools", "#mapCanvas, canvas#map, #map canvas", "#roomKey .room, #roomKey > *"]) {
        const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return { ok: false, why: "missing" }; scrollBy(0, e.getBoundingClientRect().top - innerHeight * .4); const r = e.getBoundingClientRect(); const x = r.left + Math.min(r.width / 2, 40), y = r.top + Math.min(r.height / 2, 20); const top = document.elementFromPoint(x, y); return { ok: r.height > 0 && (e === top || e.contains(top)), why: `${Math.round(r.top)} ${top && (top.id || top.className)}` }; }, s);
        check(`laptop: map tool ${s.split(",")[0]} is reachable`, r.ok, r.why);
      }
      if (tv) await tv.close();
    }
    check(`${size}: no page errors`, !p.__errs.length, p.__errs.join(" | "));
    await ctx.close();
  }
  // landscape phone
  {
    const { p, ctx } = await page(browser, { width: 844, height: 390, touch: true }, URL);
    await p.click("#impCharBtn"); await p.setInputFiles("#impCharFile", path.join(FIX, "companion-zook.json")); await p.waitForTimeout(1500);
    const w = await windowOk(p); check("landscape phone: Import window buttons are on screen", w.ok, w.why);
    await ctx.close();
  }
  await browser.close();
  // the side panel mustn't flip between one and two rows of buttons when hovered (owner's bug, 2026-11-17):
  // with real scrollbars, the panel's width changed when its scrollbar came and went, and "1–20" wrapped on and off.
  {
    const b2 = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
    let flips = 0;
    for (const h of [880, 900, 920]) {
      const ctx = await b2.newContext({ viewport: { width: 1536, height: h }, serviceWorkers: "block" });
      await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
      const p = await ctx.newPage(); await p.goto(URL + "#generate"); await p.waitForTimeout(500);
      await p.evaluate(() => { window.HS = []; const ch = document.querySelector("#genForm .chips"); const f = () => { HS.push(ch.offsetHeight); requestAnimationFrame(f); }; requestAnimationFrame(f); });
      const bx = await p.locator("#lvlMin").boundingBox();
      for (let i = 0; i < 4; i++) { await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(120); await p.mouse.move(bx.x + bx.width / 2 + 1, bx.y + bx.height / 2); await p.waitForTimeout(120); }
      const hs = await p.evaluate(() => HS); for (let i = 1; i < hs.length; i++) if (hs[i] !== hs[i - 1]) flips++;
      await ctx.close();
    }
    check("the Generate side panel stays still when you hover its level boxes", flips === 0, `${flips} jumps`);
    await b2.close();
  }
  server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll layout checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
