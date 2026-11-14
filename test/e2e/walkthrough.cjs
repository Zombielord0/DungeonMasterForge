const { chromium } = require("playwright");
const SP = process.argv[2] || require("os").tmpdir(), URL = "http://localhost:8899/";
const log = (...a) => console.log(...a);
(async () => {
  const browser = await chromium.launch();
  const errs = [];
  const mk = async (tag, opts = {}) => { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts }); const p = await ctx.newPage(); p.on("pageerror", e => errs.push(tag + ": " + e.message)); p.on("console", m => m.type() === "error" && errs.push(tag + " console: " + m.text())); return p; };
  const dm = await mk("dm");
  await dm.goto(URL);
  await dm.waitForSelector("#gate.open");
  await dm.screenshot({ path: SP + "/1-signin.png" });
  await dm.click("text=New here? Create an account");
  await dm.fill("#gName", "Matt"); await dm.fill("#gEmail", "matt@example.com"); await dm.fill("#gPass", "password123");
  await dm.click("#gateForm button[type=submit]");
  await dm.waitForSelector("#dmForm");
  await dm.screenshot({ path: SP + "/2-setup.png" });
  await dm.fill("#dCamp", "Ashes of Velmor");
  await dm.click("#dmForm button");
  await dm.waitForSelector("#gate:not(.open)", { state: "attached" });
  await dm.goto(URL + "#party");
  await dm.waitForSelector(".join-code");
  const code = await dm.textContent(".join-code");
  log("join code", code, "| DM nav:", await dm.$$eval("nav a:not([hidden])", a => a.map(x => x.textContent.trim()).join(", ")));

  const ava = await mk("ava", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await ava.goto(URL);
  await ava.click("text=New here? Create an account");
  await ava.fill("#gName", "Ava"); await ava.fill("#gEmail", "ava@example.com"); await ava.fill("#gPass", "password123");
  await ava.click("#gateForm button[type=submit]");
  await ava.fill("#jCode", code.toLowerCase());
  await ava.screenshot({ path: SP + "/3-join-mobile.png" });
  await ava.click("#joinForm button");
  await ava.waitForSelector("#gate:not(.open)", { state: "attached" });
  log("player nav:", await ava.$$eval("nav a:not([hidden])", a => a.map(x => x.textContent.trim()).join(", ")), "| hash view:", await ava.$eval("section.view.active", s => s.id));
  await ava.goto(URL + "#tracker"); log("player at #tracker lands on:", await ava.$eval("section.view.active", s => s.id));
  await ava.goto(URL + "#character");
  await ava.fill("#pcName", "Thorin");
  await ava.click("#pcForgeBtn");
  await ava.click("[data-pc=keep]");
  await ava.waitForTimeout(1500);
  log("ava badge:", await ava.textContent("#storeBadge"));

  // DM sees it
  await dm.waitForSelector(".party-card", { timeout: 10000 });
  log("DM party:", await dm.$$eval(".party-card", c => c.map(x => x.innerText.replace(/\s+/g, " ")).join(" | ")));

  // Ava changes HP on My Characters
  await ava.goto(URL + "#roster");
  await ava.waitForSelector("[data-rf=hpCur]");
  const hp0 = await ava.inputValue("[data-rf=hpCur]");
  await ava.fill("[data-rf=hpCur]", "3"); await ava.press("[data-rf=hpCur]", "Tab");
  await ava.waitForTimeout(6000);
  log("activity:", await dm.$$eval("#partyMain .feed li", l => l.map(x => x.innerText.replace(/\s+/g, " ")).join(" | ")));

  // DM whispers
  await dm.fill("#whBody", "The amulet is cursed.");
  await dm.click("#whForm button");
  await dm.waitForTimeout(500);
  await dm.screenshot({ path: SP + "/4-party.png", fullPage: true });
  await ava.evaluate(() => window.dispatchEvent(new Event("x")));
  await ava.waitForTimeout(16000);
  log("ava unread badge:", await ava.$eval("#whisperN", b => b.hidden ? "hidden" : b.textContent));
  await ava.goto(URL + "#whispers"); await ava.waitForTimeout(1500);
  log("ava whispers:", await ava.textContent("#whispersMain"));
  await ava.screenshot({ path: SP + "/5-whispers-mobile.png" });

  // Clash: DM opens Thorin and edits AC while Ava edits AC too
  await dm.click(".party-card");
  await dm.waitForSelector("#view-roster.active [data-rf=ac]");
  await ava.goto(URL + "#roster"); await ava.waitForSelector("[data-rf=ac]");
  await ava.fill("[data-rf=ac]", "20"); await ava.press("[data-rf=ac]", "Tab");
  await ava.waitForTimeout(1500);
  // DM types before their poll catches up
  await dm.fill("[data-rf=ac]", "12"); await dm.press("[data-rf=ac]", "Tab");
  await dm.waitForTimeout(2500);
  const modal = await dm.$eval("#modal", m => m.classList.contains("open") ? document.querySelector("#modalTitle").textContent + " / " + document.querySelector("#modalMsg").textContent : "no modal");
  log("DM clash:", modal);
  await dm.screenshot({ path: SP + "/6-clash.png" });
  if (modal !== "no modal") { await dm.click("#modalNo"); await dm.waitForTimeout(500); log("DM AC after taking theirs:", await dm.inputValue("[data-rf=ac]")); }

  // offline mode still works
  const off = await mk("off");
  await off.goto(URL); await off.click("text=Use without an account");
  log("offline nav:", await off.$$eval("nav a:not([hidden])", a => a.length), "badge:", await off.textContent("#storeBadge"), "acct:", await off.textContent("#acctBtn"));
  log("errors:", errs.length ? errs : "none");
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
