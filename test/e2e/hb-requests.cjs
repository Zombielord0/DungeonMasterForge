// Homebrew requests: players use the Homebrew tab, but what they make waits for the DM's approval. Run with:  npm run test:hbreq
// Builds the portal with the stand-in sign-in and starts the local copy (app + API + in-memory database) on port 8891.
const { spawn } = require("child_process"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", ".."), PORT = 8891, URL = `http://localhost:${PORT}/`;
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
(async () => {
  require("esbuild").buildSync({ absWorkingDir: ROOT, entryPoints: ["src/portal.js"], bundle: true, format: "esm", alias: { "@netlify/identity": "./test/e2e/fake-identity.js" }, outfile: ".dev/portal-hbreq.js", logLevel: "warning" });
  const srv = spawn(process.execPath, ["test/e2e/server.mjs", ".dev/portal-hbreq.js", String(PORT)], { cwd: ROOT });
  await new Promise((res, rej) => { srv.stdout.on("data", d => { if (/running/.test(String(d))) res(); }); srv.on("exit", c => rej(new Error("server exited " + c))); setTimeout(() => rej(new Error("server didn't start")), 20000); });
  const browser = await chromium.launch(), errs = [];
  try {
    const mk = async tag => { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" }); const p = await ctx.newPage(); p.on("pageerror", e => errs.push(tag + ": " + e.message)); return p; };
    const ready = p => p.waitForFunction(() => typeof renderTracker === "function" && window.Portal);
    const signUp = async (p, name, email) => {
      await p.goto(URL); await ready(p); await p.waitForSelector("#gate.open");
      await p.click("text=New here? Create an account");
      await p.fill("#gName", name); await p.fill("#gEmail", email); await p.fill("#gPass", "password123");
      await p.click("#gateForm button[type=submit]");
    };
    const dm = await mk("dm");
    await signUp(dm, "Kit", "kit@example.com"); await dm.waitForSelector("#dmForm");
    await dm.fill("#dCamp", "Velmor"); await dm.click("#dmForm button[type=submit]");
    await dm.waitForFunction(() => Portal.cloud && Portal.isDM(), null, { timeout: 15000 });
    const code = await dm.evaluate(async () => (await (await fetch("/api/me")).json()).campaigns[0].code);
    const pl = await mk("pia");
    await signUp(pl, "Pia", "pia@example.com"); await pl.waitForSelector("#jCode");
    await pl.fill("#jCode", code); await pl.fill("#jName", "Pia"); await pl.click("#joinForm button[type=submit]");
    await pl.waitForFunction(() => Portal.cloud && !Portal.isDM(), null, { timeout: 15000 });

    // ---- the player has the tab and can make a feat
    check("players see the Homebrew tab", await pl.evaluate(() => !document.querySelector('#fside nav a[data-view="homebrew"]').hidden));
    await pl.evaluate(() => { location.hash = "#homebrew"; });
    await pl.waitForSelector('#hbSide [data-hbnew="feat"]');
    check("players get no bulk import", !(await pl.$("#hbBulk")));
    await pl.click('#hbSide [data-hbnew="feat"]');
    await pl.fill('#hbMain [data-hbf="name"]', "Lucky Hat");
    await pl.fill('#hbMain [data-hbf="desc"]', "Reroll once a day.");
    check("the button says it goes to the DM", /Send to your DM/.test(await pl.textContent('#hbMain [data-hbact="save"]')));
    await pl.click('#hbMain [data-hbact="save"]');
    await pl.waitForSelector("#hbMyReqs");
    check("the player's entry shows as waiting", /Lucky Hat/.test(await pl.textContent("#hbMyReqs")));
    check("it is not in the campaign's homebrew yet", await pl.evaluate(() => !HB.list.some(x => x.name === "Lucky Hat") && !featList("2024").some(F => F[0] === "Lucky Hat")));
    check("…and the server agrees", await dm.evaluate(async () => { const me = await (await fetch("/api/me")).json(); return (await (await fetch(`/api/campaigns/${me.campaigns[0].id}/homebrew`)).json()).length === 0; }));

    // ---- a player can't go around it
    const sneak = await pl.evaluate(async () => { const me = await (await fetch("/api/me")).json(); return (await fetch(`/api/campaigns/${me.campaigns[0].id}/homebrew/hb-sneak`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: { kind: "feat", name: "Sneaky", ed: "both" } }) })).status; });
    check("a player writing homebrew straight to the server is refused", sneak === 403);

    // ---- a second request, to be turned down
    await pl.click('#hbSide [data-hbnew="feat"]');
    await pl.fill('#hbMain [data-hbf="name"]', "Infinite Gold");
    await pl.click('#hbMain [data-hbact="save"]');
    await pl.waitForFunction(() => /Infinite Gold/.test(document.querySelector("#hbMyReqs").textContent));

    // ---- the DM sees both, with who sent them
    await dm.evaluate(() => { location.hash = "#party"; });
    await dm.evaluate(() => Portal.reloadHomebrew());
    await dm.waitForSelector("#partyHbReqs", { timeout: 10000 });
    check("the Party tab says homebrew is waiting", /2 homebrew from players/.test(await dm.textContent("#partyHbReqs")));
    await dm.click("#partyHbReqs a");
    await dm.waitForSelector("#hbReqBox");
    check("the DM's list shows both and who sent them", await dm.evaluate(() => { const t = document.querySelector("#hbReqBox").textContent; return /Lucky Hat/.test(t) && /Infinite Gold/.test(t) && /from Pia/.test(t); }));
    await dm.click('#hbReqBox [data-reqrow$="|' + (await dm.evaluate(() => Portal.hbReqs().find(q => q.data.name === "Lucky Hat").id)) + '"] [data-reqact="ok"]');
    await dm.waitForFunction(() => HB.list.some(x => x.name === "Lucky Hat"));
    check("approving adds it to the campaign's homebrew", await dm.evaluate(() => featList("2024").some(F => F[0] === "Lucky Hat")));
    await dm.click('#hbReqBox [data-reqact="no"]');
    await dm.click("#modalYes");
    await dm.waitForFunction(() => !document.querySelector("#hbReqBox"));
    check("turning one down removes it and adds nothing", await dm.evaluate(() => !HB.list.some(x => x.name === "Infinite Gold") && !Portal.hbReqs().length));

    // ---- the player picks it up
    await pl.evaluate(() => Portal.reloadHomebrew());
    await pl.waitForFunction(() => HB.list.some(x => x.name === "Lucky Hat") && !document.querySelector("#hbMyReqs"));
    check("the player now has the approved feat and no waiting list", await pl.evaluate(() => featList("2024").some(F => F[0] === "Lucky Hat")));
    // opening the campaign's entry offers a change, not a delete
    await pl.click('#hbSide [data-hbsel]');
    check("a player can't delete the campaign's entry", !(await pl.$('#hbMain [data-hbact="del"]')));
    check("saving it suggests a change", /Suggest these changes/.test(await pl.textContent('#hbMain [data-hbact="save"]')));
    await pl.fill('#hbMain [data-hbf="desc"]', "Reroll twice a day.");
    await pl.click('#hbMain [data-hbact="save"]');
    await pl.waitForSelector("#hbMyReqs");
    check("the campaign's entry is unchanged until the DM approves", await pl.evaluate(() => HB.list.find(x => x.name === "Lucky Hat").desc === "Reroll once a day."));
    // and the player can withdraw it
    await pl.click('#hbMain [data-hbact="withdraw"]');
    await pl.click("#modalYes");
    await pl.waitForFunction(() => !document.querySelector("#hbMyReqs"));
    check("withdrawing takes it off the list", await pl.evaluate(() => !Portal.hbReqs().length));
  } finally {
    check("no page errors", errs.length === 0, errs.join(" | "));
    await browser.close(); srv.kill();
  }
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll homebrew request checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
