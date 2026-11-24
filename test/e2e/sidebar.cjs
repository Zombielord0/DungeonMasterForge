// The side menu (2026-11-24): tabs on the left, sections, folding, the phone panel, search, and every page opening.
// Run with:  npm run test:sidebar
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});

async function open(browser, URL, vp) {
  const ctx = await browser.newContext({ viewport: vp, serviceWorkers: "block", hasTouch: vp.width < 600, isMobile: vp.width < 600 });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const p = await ctx.newPage(); p.__errs = [];
  p.on("pageerror", e => p.__errs.push(e.message));
  p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.__errs.push(m.text()); });
  await p.goto(URL + "#generate"); await p.waitForFunction(() => typeof route === "function" && document.querySelector("#fside"), null, { timeout: 15000 }).catch(() => {});
  return { p, ctx };
}

// every visible tab and section, clicked from the menu: the right page shows, has content, and nothing errors
async function walk(p, who, phone) {
  const links = await p.evaluate(() => [...document.querySelectorAll("#fside nav a[data-view]")].filter(a => !a.hidden).map(a => a.dataset.view));
  check(`${who}: the menu lists tabs`, links.length > 0);
  for (const v of links) {
    p.__errs.length = 0;
    if (phone) { await p.click("#mobileMore"); await p.waitForTimeout(250); }
    await p.click(`#fside nav a[data-view="${v}"]`); await p.waitForTimeout(450);
    const st = await p.evaluate(v => { const s = document.querySelector("section.view.active"), want = v === "character" ? "view-roster" : "view-" + v; return { id: s && s.id, want, shown: !!(s && s.offsetParent !== null || s && getComputedStyle(s).display !== "none"), text: s ? s.innerText.trim().length : 0, open: document.documentElement.classList.contains("fside-open") }; }, v);
    check(`${who}: ${v} opens`, st.id === st.want && st.shown && st.text > 0 && !p.__errs.length, JSON.stringify(st) + " " + p.__errs.join(" | "));
    if (phone) check(`${who}: the panel closes after picking ${v}`, !st.open);
    const secs = await p.evaluate(v => [...document.querySelectorAll(`#fside [data-subs-of="${v}"] [data-side-sec]`)].map(b => b.dataset.sideSec), v);
    for (const s of secs) {
      p.__errs.length = 0;
      if (phone) { await p.click("#mobileMore"); await p.waitForTimeout(250); }
      const arrow = `#fside [data-side-toggle="${v}"]`;
      if (await p.getAttribute(arrow, "aria-expanded") !== "true") await p.click(arrow);
      await p.click(`#fside [data-side-go="${v}"][data-side-sec="${s}"]`); await p.waitForTimeout(450);
      const ok = await p.evaluate(v => document.querySelector("section.view.active")?.id === "view-" + v, v);
      check(`${who}: ${v} → ${s} opens`, ok && !p.__errs.length, p.__errs.join(" | "));
    }
  }
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    /* ---------------- laptop: the menu ---------------- */
    let { p, ctx } = await open(browser, URL, { width: 1280, height: 800 });
    check("the tabs are in the side menu, not the header", await p.evaluate(() => document.querySelectorAll("#fside nav a[data-view]").length > 10 && !document.querySelector("header nav")));
    check("the menu sits on the left beside the page", await p.evaluate(() => { const r = document.querySelector("#fside").getBoundingClientRect(), m = document.querySelector("main").getBoundingClientRect(); return r.left === 0 && r.width > 200 && m.left >= r.right - 1; }));
    check("group headings show (Players only once signed in)", await p.evaluate(() => [...document.querySelectorAll("#fside .fside-grp")].filter(h => !h.hidden).map(h => h.textContent.trim()).join(",")) === "Prep,Characters,Rules,Forge");
    await p.evaluate(() => { const k = blankCampaign("Side test"); Store.save(k); activeId = k.id; });
    await p.waitForTimeout(700);
    check("Campaign Tracker's sections start folded", await p.evaluate(() => document.querySelector('#fside [data-subs-of="tracker"]').hidden));
    await p.click('#fside [data-side-toggle="tracker"]');
    check("its arrow shows the 14 sections", await p.evaluate(() => document.querySelectorAll('#fside [data-subs-of="tracker"] [data-side-sec]').length) === 14);
    await p.click('#fside [data-side-go="tracker"][data-side-sec="loot"]'); await p.waitForTimeout(400);
    check("Tracker → Loot opens the Loot sub-tab", await p.evaluate(() => location.hash === "#tracker" && document.querySelector(".subtabs button.on")?.dataset.sub === "loot"));
    check("the open section is marked", await p.evaluate(() => document.querySelector('#fside [data-side-sec="loot"]').getAttribute("aria-current") === "true"));
    await p.click('#fside [data-side-toggle="items"]');
    await p.click('#fside [data-side-go="items"][data-side-sec="magic"]'); await p.waitForTimeout(400);
    check("Items → Magic picks the Magic list", await p.evaluate(() => location.hash === "#items" && document.querySelector('input[name=itMode][value=magic]').checked));
    await p.click('#fside [data-side-toggle="monsters"]');
    await p.click('#fside [data-side-go="monsters"][data-side-sec="srd"]'); await p.waitForTimeout(400);
    check("Villains & Monsters → Monster Manual picks it", await p.evaluate(() => document.querySelector('input[name=monMode][value=srd]').checked));
    await p.click('#fside [data-side-toggle="world"]');
    await p.click('#fside [data-side-go="world"][data-side-sec="build"]'); await p.waitForTimeout(500);
    check("World → World builder opens the builder", await p.evaluate(() => location.hash === "#world" && W.mode === "build"));
    await p.click("#sideFoldBtn"); await p.waitForTimeout(250);
    check("folding shrinks the menu to icons", await p.evaluate(() => document.querySelector("#fside").getBoundingClientRect().width < 70));
    await p.reload(); await p.waitForFunction(() => typeof route === "function"); await p.waitForTimeout(300);
    check("the menu stays folded after a refresh", await p.evaluate(() => document.querySelector("#fside").getBoundingClientRect().width < 70));
    await p.click('#fside nav a[data-view="spells"]'); await p.waitForTimeout(300);
    check("a folded menu still opens tabs", await p.evaluate(() => location.hash === "#spells"));
    await p.click("#sideFoldBtn"); await p.waitForTimeout(250);
    check("unfolding brings it back", await p.evaluate(() => document.querySelector("#fside").getBoundingClientRect().width > 200));

    /* ---------------- search ---------------- */
    await p.evaluate(() => {
      const c = generateCharacter({ seed: "side1", name: "Elara Test", cls: "Wizard", level: 5, ed: "2024" }); pcEnsure(c);
      const bad = generateCharacter({ seed: "side2", name: "<img src=x onerror=window.__x=1>Bob", cls: "Fighter", level: 2, ed: "2024" }); pcEnsure(bad);
      PCS.roster = [c, bad]; pcPersist();
    });
    await p.evaluate(() => { spLoad(); const c = PCS.roster[0], s = SP.data["2024"].find(x => x.n === "Fireball"); togglePrep(c, s, "2024"); pcPersist(); }); /* forged casters start with no spells (on purpose) */
    check("compendiumMatches finds Fireball", await p.evaluate(async () => (await compendiumMatches({ query: "fireball", ed: "2024" })).rows.some(r => r.kind === "Spell" && r.name === "Fireball")));
    await p.fill("#sideQ", "fireball"); await p.waitForTimeout(900);
    const groups = await p.evaluate(() => [...document.querySelectorAll("#sideResults .fside-rgrp")].map(h => h.textContent.trim()));
    check("fireball shows Your stuff and Rules, no Tabs", groups.join(",") === "Your stuff,Rules", groups.join(","));
    check("…with the character under Your stuff", await p.evaluate(() => [...document.querySelectorAll("#sideResults [data-side-hit]")].some(b => /Elara Test/.test(b.textContent))));
    check("…and the Fireball spell under Rules", await p.evaluate(() => [...document.querySelectorAll("#sideResults [data-side-hit]")].some(b => /^Fireball/.test(b.querySelector("b")?.textContent || ""))));
    check("…and Show all in the Compendium", await p.evaluate(() => !!document.querySelector("#sideResults [data-side-all]")));
    await p.evaluate(() => [...document.querySelectorAll("#sideResults [data-side-hit]")].find(b => /Elara Test/.test(b.textContent)).click());
    await p.waitForTimeout(700);
    check("clicking the character opens their sheet at Fireball", await p.evaluate(() => location.hash === "#roster" && RC.id === PCS.roster[0].id && /fireball/i.test(document.querySelector(".side-flash")?.textContent || "")));
    await p.fill("#sideQ", "fireball"); await p.waitForTimeout(900);
    await p.evaluate(() => [...document.querySelectorAll("#sideResults [data-side-hit]")].find(b => /^Fireball/.test(b.querySelector("b")?.textContent || "")).click());
    await p.waitForTimeout(500);
    check("clicking the spell opens its rules", await p.evaluate(() => [...document.querySelectorAll("dialog[open], .character-reference[open]")].some(d => /Fireball/.test(d.textContent))));
    await p.keyboard.press("Escape");
    await p.fill("#sideQ", "loot"); await p.waitForTimeout(900);
    check("loot shows a Tabs row", await p.evaluate(() => [...document.querySelectorAll("#sideResults .fside-rgrp")].some(h => h.textContent.trim() === "Tabs")));
    await p.fill("#sideQ", "bob"); await p.waitForTimeout(900);
    check("names show as text, never as HTML", await p.evaluate(() => window.__x === undefined && !document.querySelector("#sideResults img") && /<img/.test(document.querySelector("#sideResults").textContent)));
    await p.fill("#sideQ", "loot"); await p.waitForTimeout(900);
    await p.focus("#sideQ"); await p.keyboard.press("ArrowDown");
    check("↓ moves to the first result", await p.evaluate(() => document.activeElement?.matches("#sideResults [data-side-hit]")));
    await p.keyboard.press("Enter"); await p.waitForTimeout(500);
    check("Enter opens it", await p.evaluate(() => location.hash === "#tracker"));
    await p.fill("#sideQ", "loot"); await p.waitForTimeout(600);
    await p.focus("#sideQ"); await p.keyboard.press("Escape");
    check("Escape clears the search", await p.evaluate(() => document.querySelector("#sideQ").value === "" && document.querySelector("#sideResults").hidden));
    await ctx.close();

    /* ---------------- every page opens: laptop and phone ---------------- */
    ({ p, ctx } = await open(browser, URL, { width: 1280, height: 800 }));
    await walk(p, "laptop"); await ctx.close();
    ({ p, ctx } = await open(browser, URL, { width: 390, height: 844 }));
    check("phone: the menu is off-screen", await p.evaluate(() => document.querySelector("#fside").getBoundingClientRect().right <= 0 || getComputedStyle(document.querySelector("#fside")).visibility === "hidden"));
    await p.click("#mobileMore"); await p.waitForTimeout(300);
    check("phone: More opens the menu", await p.evaluate(() => document.documentElement.classList.contains("fside-open") && document.querySelector("#fside").getBoundingClientRect().left >= 0));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    check("phone: Escape closes it", await p.evaluate(() => !document.documentElement.classList.contains("fside-open")));
    await p.click("#mobileMore"); await p.waitForTimeout(300);
    await p.mouse.click(380, 400); await p.waitForTimeout(300);
    check("phone: tapping outside closes it", await p.evaluate(() => !document.documentElement.classList.contains("fside-open")));
    await walk(p, "phone", true); await ctx.close();
  } catch (e) { console.error(e); fails++; }
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll side menu checks passed");
  process.exit(fails ? 1 : 0);
})();
