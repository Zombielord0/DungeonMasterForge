// The Adventure, Characters and Items tabs after the UI review (2026-11-18). Run with:  npm run test:polish
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
const EMOJI = /\p{Extended_Pictographic}/u;

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

  const searchFieldsMatch = p => p.evaluate(() => {
    const character = generateCharacter({ seed: "SEARCH", ed: "2024", cls: "Druid", level: 5 });
    renderNpcLib();
    renderWorld();
    const levelUp = { ...LV };
    Object.assign(LV, { c: character, to: 8, cur: character.scores, asi: { feat: "" } });
    featOpen();
    document.getElementById("featQ").blur();
    featClose();
    Object.assign(LV, levelUp);
    const fixture = document.createElement("div");
    fixture.innerHTML = loreHTML(blankCampaign()) + prepPanelHTML(character, "rc")
      + compSectionHTML(character) + searchableChoices("Search classes", "");
    document.body.append(fixture);
    const original = getComputedStyle(document.getElementById("pcName"));
    const selectors = [
      "#compendiumQuery", "#bsQ", "#spQ", "#ftQ", "#itQ", "#npcLibQ", "#worldQ",
      "#featQ", "#loreQ", "#rcPrepQ", "#rcCompQ", "[data-choice-query]"
    ];
    const mismatches = selectors.filter(selector => {
      const field = document.querySelector(selector);
      if (!field || field.type !== "search" || field.autocomplete !== "off") return true;
      const style = getComputedStyle(field);
      return style.appearance !== "none" || style.colorScheme !== "dark"
        || ["backgroundImage", "borderColor", "borderRadius", "boxShadow"].some(key => style[key] !== original[key]);
    });
    fixture.remove();
    return mismatches;
  });

  const searchAutofillMatches = async (ctx, p) => {
    const cdp = await ctx.newCDPSession(p);
    try {
      await cdp.send("DOM.enable");
      await cdp.send("CSS.enable");
      const { root } = await cdp.send("DOM.getDocument");
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#compendiumQuery" });
      await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["autofill"] });
      return await p.locator("#compendiumQuery").evaluate(field => {
        const style = getComputedStyle(field);
        return field.matches(":autofill") && style.boxShadow.includes("rgb(21, 23, 37)") &&
          style.webkitTextFillColor === getComputedStyle(document.body).color;
      });
    } finally {
      await cdp.detach();
    }
  };

  // ---- laptop, 1440 x 900
  {
    const { ctx, p } = await open(1440, 900);
    await p.goto(URL + "#generate"); await p.waitForTimeout(500);
    const searchMismatches = await searchFieldsMatch(p);
    check("laptop: all catalog, sheet and picker searches match the original field", !searchMismatches.length, searchMismatches.join(", "));
    check("laptop: autofill keeps the search field dark", await searchAutofillMatches(ctx, p));
    const vis = sel => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }, sel);
    check("laptop: Forge Adventure is on screen without scrolling", await vis("#genForm button[type=submit]"));
    check("laptop: the empty Adventure heading is light, not dark ink", await p.evaluate(() => { const c = getComputedStyle(document.querySelector("#genOut .empty h2")).color.match(/\d+/g).map(Number); return c[0] + c[1] + c[2] > 450; }));
    check("laptop: Forge Adventure uses a drawn icon, not an emoji", await p.evaluate(e => { const b = document.querySelector("#genForm button[type=submit]"); return !new RegExp(e, "u").test(b.textContent) && b.classList.contains("ico"); }, EMOJI.source));
    await p.click("#genForm button[type=submit]"); await p.waitForTimeout(600);
    await p.evaluate(() => scrollTo(0, 700)); await p.waitForTimeout(400);
    const hs = await p.evaluate(() => document.querySelector("header").getBoundingClientRect().height);
    check("laptop: the header shrinks to one slim bar after scrolling down", hs < 90, `${Math.round(hs)}px`);
    const still = await p.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); scrollTo(0, 0); await wait(300); const el = document.querySelector("#genOut").lastElementChild, doc0 = el.getBoundingClientRect().top + scrollY; scrollTo(0, 600); await wait(300); const doc1 = el.getBoundingClientRect().top + scrollY; return { shrunk: document.documentElement.classList.contains("hdr-auto"), moved: Math.round(doc1 - doc0) }; });
    check("laptop: nothing below the header moves when it shrinks", still.shrunk && Math.abs(still.moved) <= 1, JSON.stringify(still));
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
    const hb = await p.evaluate(() => ({ h: Math.round(document.querySelector("header").getBoundingClientRect().height), full: !document.documentElement.classList.contains("hdr-auto") && !!document.querySelector(".brand small").getClientRects().length }));
    check("laptop: the full header comes back at the top", hb.full && hb.h > hs, JSON.stringify(hb)); /* the tabs moved to the side menu (2026-11-24), so the full header is one row */
    await p.goto(URL + "#character"); await p.waitForTimeout(400);
    check("laptop: Forge Character is on screen without scrolling", await vis("#pcForgeBtn"));
    await p.click("#pcForgeBtn"); await p.waitForTimeout(500);
    /* Characters and My Characters are one tab (2026-11-19): a forged character is a draft on the shared sheet */
    const acts = await p.evaluate(() => { const bar = document.querySelector("#rosterMain .draft-bar"); return { primary: bar ? [...bar.querySelectorAll(".btn.primary")].map(b => b.textContent.trim()) : [], copy: !!document.querySelector('#rosterMain [data-ra="copy"]'), sideDup: !!document.querySelector('#pcSide [data-ra="copy"]') }; });
    check("laptop: a new character's bar has one main button, Save character", acts.primary.length === 1 && /Save character/i.test(acts.primary[0]), JSON.stringify(acts.primary));
    check("laptop: Copy as text is on the sheet, and the side panel has no copies", acts.copy && !acts.sideDup);
    check("laptop: Forge Character uses a drawn icon, not an emoji", await p.evaluate(e => { const b = document.querySelector("#pcForgeBtn"); return !new RegExp(e, "u").test(b.textContent) && b.classList.contains("ico"); }, EMOJI.source));
    await p.goto(URL + "#items"); await p.waitForTimeout(400);
    check("laptop: the sort box says Type & name", await p.evaluate(() => document.querySelector('#itSort option[value="name"]').textContent === "Type & name"));
    check("laptop: the Items buttons use drawn icons, not emoji", await p.evaluate(e => ["#itNew", "#itShopBtn", "#itRandom"].every(s => { const b = document.querySelector(s); return !new RegExp(e, "u").test(b.textContent) && b.classList.contains("ico"); }), EMOJI.source));
    check("laptop: with no characters, Give items to says where to make one", await p.evaluate(() => /Characters tab/.test(document.querySelector("#itTargetRow").textContent) && !!document.querySelector('#itTargetRow a[href="#character"]')));
    await ctx.close();
  }

  // ---- a laptop window narrowed to phone width while the header is slim
  {
    const { ctx, p } = await open(1440, 900);
    await p.goto(URL + "#generate"); await p.waitForTimeout(400);
    await p.click("#genForm button[type=submit]"); await p.waitForTimeout(500);
    await p.evaluate(() => scrollTo(0, 700)); await p.waitForTimeout(300);
    await p.setViewportSize({ width: 375, height: 812 }); await p.waitForTimeout(300);
    const st = await p.evaluate(() => ({ auto: document.documentElement.classList.contains("hdr-auto"), margin: document.querySelector("header").style.marginBottom }));
    check("narrowing to phone width while the header is slim leaves no gap", !st.auto && !st.margin, JSON.stringify(st));
    await ctx.close();
  }

  // ---- phone, 375 x 812
  {
    const { ctx, p } = await open(375, 812, true);
    await p.goto(URL + "#generate"); await p.waitForTimeout(500);
    const searchMismatches = await searchFieldsMatch(p);
    check("phone: all catalog, sheet and picker searches match the original field", !searchMismatches.length, searchMismatches.join(", "));
    await p.click("#genForm button[type=submit]"); await p.waitForTimeout(900);
    const gt = await p.evaluate(() => document.querySelector("#genOut").getBoundingClientRect().top);
    check("phone: Forge Adventure brings the adventure into view", gt >= -5 && gt < 250, `${Math.round(gt)}px`);
    const lv = await p.evaluate(() => [...document.querySelectorAll("#genOut .scene-t .lvl")].every(x => getComputedStyle(x).whiteSpace === "nowrap"));
    check("phone: chapter level tags stay on one line", lv);
    check("phone: adventure chapters render as parchment with dark ink",
      await p.locator("#genOut > .sec").first().evaluate(el => {
        const css = getComputedStyle(el);
        return css.backgroundImage.includes("radial-gradient") && (c => c.length >= 3 && Math.max(...c.slice(0, 3)) <= 60)((css.color.match(/\d+/g) || []).map(Number))
          && el.scrollWidth <= el.clientWidth + 2;
      }));
    await p.goto(URL + "#monsters");
    await p.locator('label:has(input[name="monMode"][value="build"])').click();
    await p.locator("#mbPreview .statblock").waitFor();
    check("phone: the monster editor preview uses parchment and three ability columns",
      await p.locator("#mbPreview").evaluate(el => {
        const css = getComputedStyle(el);
        return css.backgroundImage.includes("radial-gradient") && (c => c.length >= 3 && Math.max(...c.slice(0, 3)) <= 60)((css.color.match(/\d+/g) || []).map(Number))
          && getComputedStyle(el.querySelector(".abil")).gridTemplateColumns.split(" ").length === 3;
      }));
    await p.goto(URL + "#character"); await p.waitForTimeout(400);
    await p.click("#pcForgeBtn"); await p.waitForTimeout(900);
    const ct = await p.evaluate(() => document.querySelector("#rosterMain").getBoundingClientRect().top);
    check("phone: Forge Character brings the sheet into view", ct >= -5 && ct < 250, `${Math.round(ct)}px`);
    const small = await p.evaluate(() => [...document.querySelectorAll("#rosterMain .card:nth-child(-n+3) button, #rosterMain .card:nth-child(-n+3) select")].filter(b => b.offsetParent).map(b => ({ t: b.textContent.trim().slice(0, 20), h: Math.round(b.getBoundingClientRect().height) })).filter(b => b.h < 44));
    check("phone: the sheet's buttons are at least 44px tall", !small.length, JSON.stringify(small));
    const over = await p.evaluate(() => { const card = document.querySelector("#rosterMain .pc-actions").closest(".card").getBoundingClientRect(); return [...document.querySelectorAll("#rosterMain .pc-actions > *, #rosterMain .pc-actions .pc-camp > *")].filter(x => x.getBoundingClientRect().right > card.right + 1).map(x => x.textContent.trim().slice(0, 20) || x.tagName); });
    check("phone: the sheet's actions stay inside the card", !over.length, JSON.stringify(over));
    await p.goto(URL + "#items"); await p.waitForTimeout(400);
    const first = await p.evaluate(() => [...document.querySelectorAll("#itList .sec-h, #itList .sp-head")].find(e => e.offsetHeight).getBoundingClientRect().top + scrollY); /* groups start folded (2026-11-18): the first visible bar or row */
    check("phone: the item list starts within the first screen", first < 812, `${Math.round(first)}px`);
    check("phone: filters are folded away", await p.evaluate(() => !document.querySelector("#itGroup").offsetParent));
    await p.click("#itFiltersBtn"); await p.waitForTimeout(150);
    check("phone: the Filters button opens them", await p.evaluate(() => !!document.querySelector("#itGroup").offsetParent && document.querySelector("#itFiltersBtn").getAttribute("aria-expanded") === "true"));
    check("phone: search stays visible", await p.evaluate(() => !!document.querySelector("#itQ, #itForm input[type=search], #itForm input[type=text]").offsetParent));
    await p.click('#itForm label.opt:has(input[name=itMode][value=custom])'); await p.waitForTimeout(150);
    check("phone: Show: Mine counts as a filter that's on", await p.evaluate(() => /1 on/.test(document.querySelector("#itFiltersBtn").textContent)), await p.evaluate(() => document.querySelector("#itFiltersBtn").textContent));
    await p.click("#itReset"); await p.waitForTimeout(150);
    check("phone: Clear filters goes back to Show: All", await p.evaluate(() => IT.mode === "all" && document.querySelector("input[name=itMode][value=all]").checked && !/on/.test(document.querySelector("#itFiltersBtn").textContent)));
    await p.click("#itList .fold-btn"); await p.waitForTimeout(100); /* groups start folded: open the first */
    await p.click("#itList .sp-head"); await p.waitForTimeout(250);
    const small2 = await p.evaluate(() => [...document.querySelectorAll("#itList .sp-detail button")].filter(b => b.offsetParent).map(b => ({ t: b.textContent.trim().slice(0, 20), h: Math.round(b.getBoundingClientRect().height) })).filter(b => b.h < 44));
    check("phone: item card buttons are at least 44px tall", !small2.length, JSON.stringify(small2));
    await ctx.close();
  }
  // ---- laptop: Items filters are not folded
  {
    const { ctx, p } = await open(1440, 900);
    await p.goto(URL + "#items"); await p.waitForTimeout(400);
    check("laptop: Items filters show without the Filters button", await p.evaluate(() => !!document.querySelector("#itGroup").offsetParent && !document.querySelector("#itFiltersBtn").offsetParent));
    await ctx.close();
  }

  // ---- owner (2026-11-25): the Tracker's Journal handouts form looks like the rest of the Forge
  {
    const { ctx, p } = await open(1366, 900);
    await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof renderTracker === "function");
    await p.evaluate(() => { const c = blankCampaign("Handouts"); Store.save(c); activeId = c.id; subTab = "handouts"; renderTracker(); });
    await p.waitForTimeout(300);
    const f = await p.evaluate(() => {
      const form = document.querySelector("#journalHandoutForm"), t = form.querySelector('input[name="title"]'), file = form.querySelector('input[name="picture"]');
      const bg = getComputedStyle(t).backgroundColor.match(/\d+/g).slice(0, 3).map(Number);
      return { dark: bg.every(v => v < 90), fields: form.querySelectorAll(".field").length, fileHidden: file.hidden || getComputedStyle(file).display === "none", fileBtn: !!file.closest("label.btn"), titleWide: t.getBoundingClientRect().width > 300 };
    });
    check("Journal handouts: the Title box is the Forge's dark field, full width", f.dark && f.titleWide, JSON.stringify(f));
    check("Journal handouts: labelled fields, and the picture upload is a Forge button", f.fields >= 3 && f.fileHidden && f.fileBtn, JSON.stringify(f));
    await ctx.close();
  }

  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll UI polish checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
