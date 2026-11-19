// The Requests tab (2026-11-19): players and DMs send feature requests; the owner (FORGE_OWNER_EMAILS) reviews them.
// Builds the portal with the stand-in sign-in and starts the local copy (app + API + in-memory database) on port 8894.
// Run with:  npm run test:requests
const { spawn } = require("child_process"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", ".."), PORT = 8894, URL = `http://localhost:${PORT}/`;
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
// a small real PNG (a 2x2 red square) to attach as a screenshot
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMAAAA0ABAH7Lh0WAAAAAElFTkSuQmCC", "base64");
(async () => {
  require("esbuild").buildSync({ absWorkingDir: ROOT, entryPoints: ["src/portal.js"], bundle: true, format: "esm", alias: { "@netlify/identity": "./test/e2e/fake-identity.js" }, outfile: ".dev/portal-requests.js", logLevel: "warning" });
  const srv = spawn(process.execPath, ["test/e2e/server.mjs", ".dev/portal-requests.js", String(PORT)], { cwd: ROOT, env: { ...process.env, FORGE_OWNER_EMAILS: "kit@example.com" } });
  await new Promise((res, rej) => { srv.stdout.on("data", d => { if (/running/.test(String(d))) res(); }); srv.on("exit", c => rej(new Error("server exited " + c))); setTimeout(() => rej(new Error("server didn't start")), 20000); });
  const browser = await chromium.launch(), errs = [];
  try {
    const mk = async (tag, phone) => { const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true, serviceWorkers: "block" } : { viewport: { width: 1280, height: 900 }, serviceWorkers: "block" }); const p = await ctx.newPage(); p.on("pageerror", e => errs.push(tag + ": " + e.message)); return p; };
    const ready = p => p.waitForFunction(() => typeof renderTracker === "function" && window.Portal);
    const signUp = async (p, name, email) => {
      await p.goto(URL); await ready(p); await p.waitForSelector("#gate.open");
      await p.click("text=New here? Create an account");
      await p.fill("#gName", name); await p.fill("#gEmail", email); await p.fill("#gPass", "password123");
      await p.click("#gateForm button[type=submit]");
    };
    // the owner (a DM) and a player in their campaign
    const dm = await mk("dm");
    await signUp(dm, "Kit", "kit@example.com"); await dm.waitForSelector("#dmForm");
    await dm.fill("#dCamp", "Velmor"); await dm.click("#dmForm button[type=submit]");
    await dm.waitForFunction(() => Portal.cloud && Portal.isDM(), null, { timeout: 15000 });
    const code = await dm.evaluate(async () => (await (await fetch("/api/me")).json()).campaigns[0].code);
    const pl = await mk("player", true);
    await signUp(pl, "Pia", "pia@example.com"); await pl.waitForSelector("#jCode");
    await pl.fill("#jCode", code); await pl.fill("#jName", "Pia"); await pl.click("#joinForm button[type=submit]");
    await pl.waitForFunction(() => Portal.cloud && /Shared with campaign/.test(document.getElementById("storeBadge").textContent), null, { timeout: 15000 });

    // the player sends a request with a screenshot
    check("players have a Requests tab", await pl.evaluate(() => !document.querySelector('nav a[data-view="requests"]').hidden));
    await pl.goto(URL + "#requests"); await pl.waitForSelector("#rqForm");
    check("the form says screenshots make approval more likely", /more likely to be approved/.test(await pl.textContent("#rqSide")));
    await pl.click("#rqSend"); await pl.waitForTimeout(200);
    check("an empty form isn't sent", await pl.evaluate(() => (RQ.list || []).length === 0));
    await pl.fill("#rqTitle", 'Fold the spell list <img src=x class="pwn" onerror="window.__pwned=1">');
    await pl.selectOption("#rqKind", "change"); await pl.selectOption("#rqArea", "spells");
    await pl.fill("#rqProblem", "The spell list is far too long to scroll on my phone.");
    await pl.fill("#rqIdea", "Let each spell level fold away.");
    await pl.fill("#rqSteps", "1. Open Spells\n2. Tap a level\n3. It folds");
    await pl.selectOption("#rqEdition", "2024"); await pl.fill("#rqRules", "Player's Handbook 2024");
    await pl.check('[data-rqdev="phone"]');
    await pl.setInputFiles("#rqFile", { name: "shot.png", mimeType: "image/png", buffer: PNG }); await pl.waitForSelector(".rq-shot img");
    check("the screenshot is shrunk to a JPEG and shown before sending", await pl.evaluate(() => /^data:image\/jpeg;base64,/.test(RQ.image)));
    await pl.click("#rqSend"); await pl.waitForFunction(() => (RQ.list || []).length === 1, null, { timeout: 10000 });
    check("the request shows under Your requests as New", /Your requests/.test(await pl.textContent("#rqMain")) && /New/.test(await pl.textContent("#rqMain .rq-card")));
    check("the form is cleared after sending", await pl.evaluate(() => !document.querySelector("#rqTitle").value && !RQ.image));

    // the owner sees everyone's, with who sent it
    await dm.goto(URL + "#requests"); await dm.waitForFunction(() => RQ.list && RQ.list.length === 1, null, { timeout: 10000 });
    check("the owner sees All requests", /All requests/.test(await dm.textContent("#rqMain")));
    await dm.click("#rqMain [data-rqopen]"); await dm.waitForTimeout(200);
    const body = await dm.textContent("#rqMain");
    check("…with every part of the request and who sent it", /far too long/.test(body) && /fold away/.test(body) && /Tap a level/.test(body) && /Player's Handbook 2024/.test(body) && /pia@example.com/.test(body), body.slice(0, 400));
    check("…and the screenshot", await dm.evaluate(() => !!document.querySelector("#rqMain .rq-img img")));
    check("a title with page code in it runs nothing", await dm.evaluate(() => !window.__pwned && !document.querySelector("img.pwn")));
    const brief = await dm.evaluate(() => rqBrief(RQ.list[0]));
    check("Copy as a brief has the title and every section", /^# Feature request: Fold the spell list/.test(brief) && /## What they're trying to do/.test(brief) && /## Step by step/.test(brief) && /Screenshot/.test(brief), brief);
    await dm.selectOption("#rqMain [data-rqstatus]", "planned"); await dm.waitForTimeout(400);
    if (process.env.SHOTS) { await dm.screenshot({ path: path.join(process.env.SHOTS, "rq-owner.png") }); await pl.goto(URL + "#requests"); await pl.waitForSelector("#rqForm"); await pl.screenshot({ path: path.join(process.env.SHOTS, "rq-player.png"), fullPage: false }); }
    check("a request stays open in the owner's list after its status changes", !!(await dm.$("#rqMain [data-rqreply]")));
    await dm.fill("#rqMain [data-rqreply]", "Good idea, it's coming."); await dm.click("#rqMain [data-rqsave]"); await dm.waitForTimeout(400);

    // the player sees the status and the reply, and can no longer take it back
    await pl.click("[data-rqreload]"); await pl.waitForFunction(() => RQ.list && RQ.list[0] && RQ.list[0].status === "planned", null, { timeout: 10000 });
    check("the player sees Planned and the owner's reply", /Planned/.test(await pl.textContent("#rqMain")) && /Good idea, it's coming/.test(await pl.textContent("#rqMain")));
    await pl.click("#rqMain [data-rqopen]"); await pl.waitForTimeout(150);
    check("…and can't take it back once it's been looked at", !(await pl.$("#rqMain [data-rqdel]")));
    check("players don't see the owner's tools", !(await pl.$("#rqMain [data-rqstatus]")) && !(await pl.$("#rqMain [data-rqbrief]")));

    // a lost connection while sending: a message, the button comes back, and what you typed stays
    await pl.fill("#rqTitle", "Offline idea"); await pl.selectOption("#rqArea", "items");
    await pl.fill("#rqProblem", "Typed on a train with no signal."); await pl.fill("#rqIdea", "It should keep my words.");
    await pl.route("**/api/requests", r => r.abort()); await pl.click("#rqSend"); await pl.waitForTimeout(600);
    check("a lost connection doesn't leave Send stuck, and keeps the text", await pl.evaluate(() => !RQ.busy && !document.querySelector("#rqSend").disabled && document.querySelector("#rqTitle").value === "Offline idea"));
    check("…and says it couldn't send", /offline|connection/i.test(await pl.textContent("#toast")), await pl.textContent("#toast"));
    await pl.unroute("**/api/requests");
    // a bug report asks what happened and what should have happened
    await pl.selectOption("#rqKind", "bug"); await pl.waitForTimeout(100);
    check("choosing 'Something is broken' asks what happened and what should have", /What happened/.test(await pl.textContent('label[for="rqProblem"]')) && /should have happened/.test(await pl.textContent('label[for="rqIdea"]')) && await pl.inputValue("#rqTitle") === "Offline idea");
    // the owner's half-typed reply survives another card changing
    await pl.evaluate(() => { RQ.draft = RQ_BLANK(); rqRenderSide(); });
    await dm.evaluate(() => { RQ.list.push({ ...RQ.list[0], id: "00000000-0000-0000-0000-000000000000", data: { ...RQ.list[0].data, title: "Another" } }); RQ.open.add(RQ.list[0].id); rqRenderMain(); });
    await dm.fill(`#rqMain [data-rqreply="${await dm.evaluate(() => RQ.list[0].id)}"]`, "Half-typed thought");
    await dm.evaluate(() => rqRenderMain());
    check("an owner's unsaved reply survives the list redrawing", (await dm.inputValue(`#rqMain [data-rqreply="${await dm.evaluate(() => RQ.list[0].id)}"]`)) === "Half-typed thought");
    const brief2 = await dm.evaluate(() => rqBrief({ ...RQ.list[0], data: { ...RQ.list[0].data, devices: [] } }));
    check("the brief is marked as a user's request and its details are a tidy list", /written by a user of the Forge/i.test(brief2) && /^- \*\*Kind:\*\*/m.test(brief2) && !/\n\n\n/.test(brief2) && !/^- \*\*Kind:\*\*.*\n\n- /m.test(brief2), brief2);

    // without signing in, the tab explains instead
    const off = await mk("offline"); await off.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    await off.goto(URL + "#requests"); await off.waitForTimeout(800);
    check("without signing in, the tab asks you to sign in", /Sign in to send a request/.test(await off.textContent("#rqSide")));
    check("no page errors", errs.length === 0, errs.join(" | "));
  } finally { await browser.close(); srv.kill(); }
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll request checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
