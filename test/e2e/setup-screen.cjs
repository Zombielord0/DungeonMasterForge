// The DM setup screen: optional campaign name, "Not now", and renaming from the Account window. Run with:  npm run test:setup
// Builds the portal with the stand-in sign-in and starts the local copy (app + API + in-memory database) on port 8897.
const { spawn } = require("child_process"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", ".."), PORT = 8897, URL = `http://localhost:${PORT}/`;
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
(async () => {
  require("esbuild").buildSync({ absWorkingDir: ROOT, entryPoints: ["src/portal.js"], bundle: true, format: "esm", alias: { "@netlify/identity": "./test/e2e/fake-identity.js" }, outfile: ".dev/portal-setup.js", logLevel: "warning" });
  const srv = spawn(process.execPath, ["test/e2e/server.mjs", ".dev/portal-setup.js", String(PORT)], { cwd: ROOT });
  await new Promise((res, rej) => { srv.stdout.on("data", d => { if (/running/.test(String(d))) res(); }); srv.on("exit", c => rej(new Error("server exited " + c))); setTimeout(() => rej(new Error("server didn't start")), 20000); });
  const browser = await chromium.launch(), errs = [];
  try {
    const mk = async tag => { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" }); const p = await ctx.newPage(); p.on("pageerror", e => errs.push(tag + ": " + e.message)); return p; };
    const signUp = async (p, name, email) => {
      await p.goto(URL); await p.waitForSelector("#gate.open");
      await p.click("text=New here? Create an account");
      await p.fill("#gName", name); await p.fill("#gEmail", email); await p.fill("#gPass", "password123");
      await p.click("#gateForm button[type=submit]");
    };
    const acct = p => p.textContent("#acctBtn");
    // 1. the setup screen: name optional
    const dm = await mk("dm");
    await signUp(dm, "Kit", "kit@example.com"); await dm.waitForSelector("#dmForm");
    check("the campaign name isn't required and hints 'New Campaign'", await dm.getAttribute("#dCamp", "placeholder") === "New Campaign" && await dm.getAttribute("#dCamp", "required") === null && await dm.getAttribute("#dName", "required") === null);
    // 2. Not now
    check("a new DM sees 'Not now'", await dm.locator("#gLater").count() === 1);
    await dm.click("#gLater"); await dm.waitForSelector("#gate:not(.open)", { state: "attached" });
    check("Not now closes the screen, still signed in", (await acct(dm)).trim() === "kit@example.com", await acct(dm));
    // 3. reload: it stays closed
    await dm.reload(); await dm.waitForTimeout(2500);
    check("after a reload the setup screen stays away", await dm.locator("#gate.open").count() === 0);
    // 4. start a campaign later, leaving both boxes blank
    await dm.click("#acctBtn"); await dm.click("text=Join or start another campaign"); await dm.waitForSelector("#dmForm");
    await dm.fill("#dName", ""); await dm.click("#dmForm button[type=submit]");
    await dm.waitForSelector("#gate:not(.open)", { state: "attached" }); await dm.waitForTimeout(500);
    check("a blank campaign is 'New Campaign' run by 'DM'", (await acct(dm)).trim() === "DM · New Campaign", await acct(dm));
    // 5. rename
    await dm.click("#acctBtn"); await dm.waitForSelector("#aCampName");
    check("the Account window offers a rename", await dm.inputValue("#aCampName") === "New Campaign");
    await dm.fill("#aCampName", "Velmor Reborn"); await dm.click("#aRename button[type=submit]"); await dm.waitForTimeout(600);
    check("renaming changes the campaign", (await acct(dm)).trim() === "DM · Velmor Reborn", await acct(dm));
    // 6. reload: the new name comes from the server, and Not now is forgotten
    await dm.reload(); await dm.waitForFunction(() => /Velmor/.test((document.getElementById("acctBtn") || {}).textContent || ""), null, { timeout: 15000 }).catch(() => {});
    check("after a reload the new name is kept", (await acct(dm)).trim() === "DM · Velmor Reborn", await acct(dm));
    check("making a campaign forgets Not now", await dm.evaluate(() => !Object.keys(localStorage).some(k => k.startsWith("dmforge.setupLater."))));
    // 7. a blank rename is refused
    await dm.click("#acctBtn"); await dm.waitForSelector("#aCampName"); await dm.fill("#aCampName", "   "); await dm.click("#aRename button[type=submit]"); await dm.waitForTimeout(300);
    check("a blank rename is refused", /Give the campaign a name/.test(await dm.textContent("#gate .gate-err")) && (await acct(dm)).trim() === "DM · Velmor Reborn");
    await dm.click('#gate [data-g="close"]');
    // 8. a player has no rename
    await dm.goto(URL + "#party"); await dm.waitForSelector(".join-code"); const code = (await dm.textContent(".join-code")).trim();
    const ava = await mk("ava"); await signUp(ava, "Ava", "ava@example.com"); await ava.waitForSelector("#joinForm");
    await ava.fill("#jCode", code); await ava.click("#joinForm button[type=submit]"); await ava.waitForSelector("#gate:not(.open)", { state: "attached" }); await ava.waitForTimeout(500);
    await ava.click("#acctBtn"); await ava.waitForSelector("#gate.open");
    check("a player's Account window has no rename", await ava.locator("#aRename").count() === 0 && /Velmor Reborn/.test(await ava.textContent("#gate")));
    check("no page errors", !errs.length, errs.join(" | "));
  } catch (e) { console.error(e); fails++; }
  await browser.close(); srv.kill();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll setup screen checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
