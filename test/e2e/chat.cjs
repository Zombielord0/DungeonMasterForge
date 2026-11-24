// Chat: players talk with their DM (both ways) and with each other in a party chat the DM never sees. Run with:  npm run test:chat
// Builds the portal with the stand-in sign-in and starts the local copy (app + API + in-memory database) on port 8893.
const { spawn } = require("child_process"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", ".."), PORT = 8893, URL = `http://localhost:${PORT}/`;
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
(async () => {
  require("esbuild").buildSync({ absWorkingDir: ROOT, entryPoints: ["src/portal.js"], bundle: true, format: "esm", alias: { "@netlify/identity": "./test/e2e/fake-identity.js" }, outfile: ".dev/portal-chat.js", logLevel: "warning" });
  const srv = spawn(process.execPath, ["test/e2e/server.mjs", ".dev/portal-chat.js", String(PORT)], { cwd: ROOT });
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
    const join = async (p, name, email, code) => {
      await signUp(p, name, email); await p.waitForSelector("#jCode");
      await p.fill("#jCode", code); await p.fill("#jName", name); await p.click("#joinForm button[type=submit]");
      await p.waitForFunction(() => Portal.cloud && !Portal.isDM(), null, { timeout: 15000 });
    };
    const cidOf = p => p.evaluate(async () => (await (await fetch("/api/me")).json()).campaigns[0].id);
    const say = (p, to, body) => p.evaluate(async ([to, body]) => { const me = await (await fetch("/api/me")).json(); return (await fetch(`/api/campaigns/${me.campaigns[0].id}/whispers`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to, body }) })).status; }, [to, body]);
    const rows = p => p.evaluate(async () => { const me = await (await fetch("/api/me")).json(); return (await fetch(`/api/campaigns/${me.campaigns[0].id}/whispers`)).json(); });
    const myId = p => p.evaluate(async () => (await (await fetch("/api/me")).json()).user.id);

    const dm = await mk("dm");
    await signUp(dm, "Kit", "kit@example.com"); await dm.waitForSelector("#dmForm");
    await dm.fill("#dCamp", "Velmor"); await dm.click("#dmForm button[type=submit]");
    await dm.waitForFunction(() => Portal.cloud && Portal.isDM(), null, { timeout: 15000 });
    const code = await dm.evaluate(async () => (await (await fetch("/api/me")).json()).campaigns[0].code);
    const pia = await mk("pia", true), rook = await mk("rook");
    await join(pia, "Pia", "pia@example.com", code);
    await join(rook, "Rook", "rook@example.com", code);
    const piaId = await myId(pia);
    if (!piaId) throw new Error("no user id from /api/me");

    // ---- the player's Chat tab
    check("the player's tab is called Chat", await pia.evaluate(() => /Chat/.test(document.querySelector('nav a[data-view="whispers"]').textContent)));
    await pia.evaluate(() => { location.hash = "#whispers"; });
    await pia.waitForSelector("#whispersMain [data-chat-open=dm]");
    check("Chat shows the DM and Party conversations", await pia.evaluate(() => !!document.querySelector("#whispersMain [data-chat-open=party]") && /DM/.test(document.querySelector("#whispersMain [data-chat-open=dm]").textContent) && /Party/.test(document.querySelector("#whispersMain [data-chat-open=party]").textContent)));
    await pia.evaluate(() => { location.hash = "#roster"; });

    // the DM's message pops up a banner with Reply
    check("the DM can message a player", await say(dm, piaId, "The door is trapped.") === 201);
    await pia.waitForSelector("#whisperAlert [data-wa=reply]", { timeout: 15000 });
    await pia.click("#whisperAlert [data-wa=reply]");
    await pia.waitForFunction(() => location.hash === "#whispers" && [...document.querySelectorAll("#whispersMain .chat-list li.theirs")].some(li => /The door is trapped/.test(li.textContent)), null, { timeout: 10000 });
    check("Reply opens the DM conversation and the banner goes away", await pia.evaluate(() => !document.getElementById("whisperAlert")));

    // typing and Enter sends
    await pia.fill(".chat-form textarea", "Can I check?");
    await pia.press(".chat-form textarea", "Enter");
    await pia.waitForFunction(() => [...document.querySelectorAll(".chat-list li.mine")].some(li => /Can I check\?/.test(li.textContent)), null, { timeout: 10000 });
    check("Enter sends a reply, shown as your bubble", true);
    check("the DM receives the reply", (await rows(dm)).some(w => w.body === "Can I check?" && w.thread === piaId));

    // a poll doesn't wipe a half-typed message
    await pia.fill(".chat-form textarea", "half a mess");
    await say(dm, piaId, "Go on…");
    await pia.waitForFunction(() => /Go on/.test(document.querySelector(".chat-list").textContent), null, { timeout: 10000 });
    await pia.waitForTimeout(3500);
    check("a half-typed message survives new messages arriving", await pia.evaluate(() => { const t = document.querySelector(".chat-form textarea"); return t.value === "half a mess" && document.activeElement === t; }));

    // Enter twice quickly sends once
    await pia.fill(".chat-form textarea", "once only");
    await pia.evaluate(() => { const t = document.querySelector(".chat-form textarea"); for (let i = 0; i < 2; i++) t.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); });
    await pia.waitForTimeout(1500);
    check("Enter pressed twice quickly sends one message", (await rows(pia)).filter(w => w.body === "once only").length === 1);
    // Shift+Enter is a new line, not a send
    await pia.fill(".chat-form textarea", "line one");
    await pia.press(".chat-form textarea", "Shift+Enter");
    await pia.waitForTimeout(600);
    check("Shift+Enter doesn't send", !(await rows(pia)).some(w => /^line one/.test(w.body)));
    await pia.fill(".chat-form textarea", "");

    // ---- the party chat
    await rook.evaluate(() => { location.hash = "#whispers"; });
    await rook.waitForSelector("#whispersMain [data-chat-open=party]");
    await rook.click("#whispersMain [data-chat-open=party]");
    await rook.fill(".chat-form textarea", "First watch?");
    await rook.press(".chat-form textarea", "Enter");
    await rook.waitForFunction(() => /First watch/.test(document.querySelector(".chat-list").textContent), null, { timeout: 10000 });
    await pia.waitForFunction(() => { const b = document.querySelector("#whispersMain [data-chat-open=party] .chat-n"); return b && !b.hidden && b.textContent === "1"; }, null, { timeout: 15000 });
    check("a party message shows a count on the Party conversation", true);
    await pia.click("#whispersMain [data-chat-open=party]");
    await pia.waitForFunction(() => [...document.querySelectorAll(".chat-list li.theirs")].some(li => /First watch/.test(li.textContent) && /Rook/.test(li.textContent)), null, { timeout: 10000 });
    check("party bubbles carry the sender's name", true);
    check("the DM's account never gets party messages", !(await rows(dm)).some(w => w.thread === "party" || /First watch/.test(w.body)));

    // reading older messages isn't interrupted by new ones
    for (let i = 0; i < 30; i++) await say(rook, "party", "Message number " + i + " about the long road ahead");
    await pia.waitForFunction(() => /Message number 29/.test(document.querySelector(".chat-list").textContent), null, { timeout: 15000 });
    await pia.evaluate(() => { document.querySelector(".chat-list").scrollTop = 0; });
    await say(rook, "party", "One more thing");
    await pia.waitForFunction(() => /One more thing/.test(document.querySelector(".chat-list").textContent), null, { timeout: 15000 });
    check("a new message doesn't yank you down while you read older ones", await pia.evaluate(() => document.querySelector(".chat-list").scrollTop < 50));

    // a long word wraps on a phone
    await say(rook, "party", "x".repeat(300));
    await pia.waitForFunction(() => /xxxxxxxxxx/.test(document.querySelector(".chat-list").textContent), null, { timeout: 15000 });
    check("a long word wraps on a phone", await pia.evaluate(() => document.documentElement.scrollWidth <= 390), await pia.evaluate(() => document.documentElement.scrollWidth));
  } finally {
    check("no page errors", errs.length === 0, errs.join(" | "));
    await browser.close(); srv.kill();
  }
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll chat checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
