// Characters and My Characters as one tab (2026-11-19): forge, drafts, save, reroll, discard, the step-by-step builder.
// Run with:  npm run test:chartab
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webp": "image/webp" };
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
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  const st = () => p.evaluate(() => ({ draft: !!document.querySelector("#rosterMain .draft-bar"), saved: PCS.roster.map(c => c.name), cur: currentPC && currentPC.name, list: document.querySelector("#rosterList").textContent.replace(/\s+/g, " ").trim() }));
  const yes = async () => { await p.waitForSelector("#modal.open"); await p.click("#modalYes"); await p.waitForTimeout(150); };

  await p.goto(URL + "#character"); await p.waitForFunction(() => typeof renderRosterTab === "function" && $("#storeBadge").textContent !== "Connecting…", null, { timeout: 15000 });
  const nav = await p.evaluate(() => [...document.querySelectorAll("nav a[data-view]")].filter(a => !a.hidden).map(a => a.textContent.trim()));
  check("the tab bar has one Characters tab and no My Characters", nav.filter(t => /Characters/.test(t)).length === 1 && !nav.some(t => /My Characters/.test(t)), JSON.stringify(nav));
  check("#character opens the Characters tab with the forge form open", await p.evaluate(() => document.querySelector("#view-roster").classList.contains("active") && document.querySelector("#forgeBox").open && !!document.querySelector('nav a[data-view="roster"].active')));
  check("with no characters, the sheet area invites forging", await p.evaluate(() => /A hero steps from the dark/.test(document.querySelector("#rosterMain").textContent)));

  // forge: a draft on the shared, editable sheet
  await p.fill("#pcName", "Mira Ashdown"); await p.click("#pcForgeBtn"); await p.waitForTimeout(300);
  let s = await st();
  check("forging shows the new character on the sheet as a draft", s.draft && s.cur === "Mira Ashdown" && !s.saved.length, JSON.stringify(s));
  check("the list shows the draft as New · not saved", /Mira Ashdown New · not saved/.test(s.list), s.list);
  check("forging folds the forge form away", await p.evaluate(() => !document.querySelector("#forgeBox").open));
  check("the draft's sheet is the editable one (rolls and fields)", await p.evaluate(() => !!document.querySelector('#rosterMain [data-rf="name"]') && !!document.querySelector("#rosterMain [data-roll]")));
  // editing the draft changes it, and it survives a reload while unsaved
  await p.fill('#rosterMain [data-rf="name"]', "Mira the Bold"); await p.locator('#rosterMain [data-rf="name"]').dispatchEvent("change"); await p.waitForTimeout(200);
  check("editing the draft's name changes the draft", await p.evaluate(() => currentPC.name === "Mira the Bold"));
  await p.reload(); await p.waitForFunction(() => typeof renderRosterTab === "function" && $("#storeBadge").textContent !== "Connecting…", null, { timeout: 15000 }); await p.waitForTimeout(300);
  s = await st();
  check("an unsaved draft is still there after a reload", s.draft && s.cur === "Mira the Bold" && !s.saved.length, JSON.stringify(s));

  // reroll replaces the draft, still unsaved
  const before = await p.evaluate(() => currentPC.id);
  await p.click('[data-draft="reroll"]'); await p.waitForTimeout(300);
  check("Reroll makes a new draft, still not saved", await p.evaluate(b => currentPC.id !== b && !PCS.roster.length && !!document.querySelector(".draft-bar"), before));
  // save it
  const name = await p.evaluate(() => currentPC.name);
  await p.click('[data-draft="keep"]'); await p.waitForTimeout(300);
  s = await st();
  check("Save character moves it into your characters", !s.draft && JSON.stringify(s.saved) === JSON.stringify([name]) && !s.cur && !/not saved/.test(s.list), JSON.stringify(s));
  check("the saved character is shown, with Delete", await p.evaluate(() => !!document.querySelector('#rosterMain [data-ra="del"]') && !document.querySelector(".draft-bar")));

  // a second draft, then discard it (and Delete on a draft discards too)
  await p.click("#forgeBox > summary"); await p.fill("#pcName", "Throwaway"); await p.click("#pcForgeBtn"); await p.waitForTimeout(300);
  s = await st();
  check("a second draft sits above the saved character", s.draft && /^Throwaway New · not saved/.test(s.list) && s.saved.length === 1, s.list);
  await p.click(`#rosterList [data-rc="${await p.evaluate(() => PCS.roster[0].id)}"]`); await p.waitForTimeout(200);
  check("clicking a saved character shows it; the draft stays in the list", await p.evaluate(n => document.querySelector('#rosterMain [data-rf="name"]').value === n && !document.querySelector(".draft-bar") && /Throwaway/.test(document.querySelector("#rosterList").textContent), name));
  await p.click("#rosterList .pc-draft"); await p.waitForTimeout(200);
  await p.click('[data-draft="discard"]'); await yes();
  s = await st();
  check("Discard removes the draft and keeps the saved one", !s.cur && s.saved.length === 1 && !/Throwaway/.test(s.list), JSON.stringify(s));
  await p.click("#forgeBox > summary"); await p.fill("#pcName", "Second Throwaway"); await p.click("#pcForgeBtn"); await p.waitForTimeout(300);
  await p.click('#rosterMain [data-ra="del"]'); await yes();
  s = await st();
  check("Delete on a draft discards it, never a saved character", !s.cur && s.saved.length === 1, JSON.stringify(s));

  // the step-by-step builder takes the main column, and quitting brings the sheet back
  await p.click("#forgeBox > summary"); await p.click('#pcForm label.opt:has(input[name=pcMode][value=custom])'); await p.click("#pcForgeBtn"); await p.waitForTimeout(300);
  check("Custom, step by step shows the builder in place of the sheet", await p.evaluate(() => !document.querySelector("#pcOut").hidden && document.querySelector("#rosterMain").hidden && /Create a custom character/.test(document.querySelector("#pcOut").textContent)));
  await p.click("[data-cbquit]"); await p.waitForTimeout(200);
  check("quitting the builder brings the sheet back", await p.evaluate(() => document.querySelector("#pcOut").hidden && !document.querySelector("#rosterMain").hidden));
  await p.click("#forgeBox > summary"); await p.click("#pcForgeBtn"); await p.waitForTimeout(200);
  await p.click(`#rosterList [data-rc="${await p.evaluate(() => PCS.roster[0].id)}"]`); await p.waitForTimeout(200);
  check("picking a character while building shows its sheet", await p.evaluate(() => document.querySelector("#pcOut").hidden && !document.querySelector("#rosterMain").hidden && !CB.on));

  // arriving through #character (old links, a player's landing page): the address becomes #roster, so refreshes after
  // level-up and dialogs still redraw the sheet (they check the address)
  await p.goto(URL + "#character"); await p.waitForTimeout(400);
  check("#character turns into #roster in the address bar", await p.evaluate(() => location.hash === "#roster"));
  await p.click('#rosterMain [data-lvup]'); await p.waitForSelector("#lvModal.open");
  await p.evaluate(() => { const r = document.querySelector('#lvModal input[name="lvAsiMode"]'); if (r) r.click(); });
  await p.click("#lvModal [data-lvyes]"); await p.waitForTimeout(300);
  check("levelling up after arriving by #character updates the sheet", await p.evaluate(() => PCS.roster[0].level === 2 && document.querySelector("#rosterMain [data-rlv]").value === "2"), await p.evaluate(() => `${PCS.roster[0].level} / ${document.querySelector("#rosterMain [data-rlv]").value}`));

  // a shared sheet's numbers can't carry page code (another player's character in a campaign)
  await p.evaluate(() => { const c = JSON.parse(JSON.stringify(PCS.roster[0])); c.id = "evil"; c.name = "Evil"; c.level = '2<img src=x onerror="window.__pwned=1">'; c.hp = "<b>9</b>"; PCS.roster.push(pcEnsure(c)); renderRoster(); });
  await p.waitForTimeout(200);
  check("a character's level and HP are numbers once loaded, not page code", await p.evaluate(() => !window.__pwned && !document.querySelector("#rosterList img") && PCS.roster[1].level === 2 && typeof PCS.roster[1].hp === "number"));

  // other tabs point at the Characters tab
  await p.evaluate(() => { PCS.roster = []; currentPC = null; pcPersist(); });
  await p.goto(URL + "#items"); await p.waitForTimeout(400);
  check("Items: Give items to points at the Characters tab", await p.evaluate(() => /Characters tab/.test(document.querySelector("#itTargetRow").textContent) && !/My characters/i.test(document.querySelector("#itTargetRow").textContent)));
  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
