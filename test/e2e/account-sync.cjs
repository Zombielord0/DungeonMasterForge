// The DM's Campaign Tracker, World, NPCs, custom items and My monsters saved to their account. Run with:  npm run test:sync
// Builds the portal with the stand-in sign-in and starts the local copy (app + API + in-memory database) on port 8896.
// Two browsers stand in for two devices of the same DM.
const { spawn } = require("child_process"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", ".."), PORT = 8896, URL = `http://localhost:${PORT}/`;
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
(async () => {
  require("esbuild").buildSync({ absWorkingDir: ROOT, entryPoints: ["src/portal.js"], bundle: true, format: "esm", alias: { "@netlify/identity": "./test/e2e/fake-identity.js" }, outfile: ".dev/portal-sync.js", logLevel: "warning" });
  const srv = spawn(process.execPath, ["test/e2e/server.mjs", ".dev/portal-sync.js", String(PORT)], { cwd: ROOT });
  await new Promise((res, rej) => { srv.stdout.on("data", d => { if (/running/.test(String(d))) res(); }); srv.on("exit", c => rej(new Error("server exited " + c))); setTimeout(() => rej(new Error("server didn't start")), 20000); });
  const browser = await chromium.launch(), errs = [];
  try {
    const mk = async tag => { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" }); const p = await ctx.newPage(); p.on("pageerror", e => errs.push(tag + ": " + e.message)); return p; };
    const ready = p => p.waitForFunction(() => typeof Cloud !== "undefined" && typeof renderTracker === "function");
    const saved = p => p.waitForFunction(() => Cloud.on && !Cloud.offline && !Object.keys(Cloud.meta.dirty).length && !Object.values(Cloud.busy).some(Boolean), null, { timeout: 15000 });
    const signUp = async (p, name, email) => {
      await p.goto(URL); await ready(p); await p.waitForSelector("#gate.open");
      await p.click("text=New here? Create an account");
      await p.fill("#gName", name); await p.fill("#gEmail", email); await p.fill("#gPass", "password123");
      await p.click("#gateForm button[type=submit]");
    };
    const signIn = async (p, email) => {
      await p.goto(URL); await ready(p); await p.waitForSelector("#gate.open");
      await p.fill("#gEmail", email); await p.fill("#gPass", "password123"); await p.click("#gateForm button[type=submit]");
    };
    const notNow = async p => { await p.waitForSelector("#gLater"); await p.click("#gLater"); };
    const docs = p => p.evaluate(async () => (await (await fetch("/api/me/docs")).json()));
    const camps = p => p.evaluate(() => Store.list().map(c => c.name).sort());

    // 1. A browser with work made without an account
    const A = await mk("A");
    await A.goto(URL); await ready(A);
    await A.evaluate(() => {
      const c = blankCampaign("Home Game"); c.npcs = [{ id: "n1", name: "Sera" }]; Store.save(c);
      W.loaded || worldLoad(); W.places.push({ id: "wp-home", name: "Millbrook", type: "village", parent: null, desc: "" }); worldSave();
      npcLooseSave([{ id: "nl-tom", lib: "nl-tom", name: "Old Tom" }]);
      MB.lib.push({ ...mbBlank(), id: "mm-gloom", name: "Gloom Hound" }); mbSaveLib();
    });
    await A.waitForTimeout(900);

    // 2. the DM signs up there and adds it to the account
    await signUp(A, "Kit", "kit@example.com"); await notNow(A);
    await A.waitForSelector("#modal.open", { timeout: 10000 }).catch(() => {});
    const offer = await A.textContent("#modalMsg").catch(() => "");
    check("signing in offers to add this browser's work to the account", /1 Tracker campaign, 1 World place, 1 NPC, 1 custom item and monster/.test(offer), offer);
    await A.click("#modalYes");
    await saved(A);
    let d = await docs(A);
    const ids = d.docs.map(x => x.id).sort();
    check("the account now has the campaign, World, NPCs and monsters", ids.some(i => i.startsWith("c-")) && ["mymonsters", "npclib", "world"].every(i => ids.includes(i)), ids.join(", "));
    check("the badge says it's saved to the account", /Saved to your account/.test(await A.textContent("#storeBadge")), await A.textContent("#storeBadge"));
    check("the browser's own copy is set aside for signing out", await A.evaluate(() => !!localStorage.getItem("dmforge.stash.v1")));

    // 3. edits go to the account
    await A.evaluate(() => { const c = Store.list()[0]; c.name = "Home Game: Act II"; Store.save(c); wpNew({ name: "Ravenhold", type: "town" }); worldSave(); });
    await A.waitForTimeout(800); await saved(A);
    d = await docs(A);
    check("a rename reaches the account", d.docs.some(x => x.data && x.data.name === "Home Game: Act II"));
    check("a new World place reaches the account", (d.docs.find(x => x.id === "world").data.places || []).some(p => p.name === "Ravenhold"));

    // 4. a second device sees it all, and isn't asked about its own (empty) browser
    const B = await mk("B");
    await signIn(B, "kit@example.com"); await notNow(B); await saved(B);
    check("device B has the DM's Tracker campaign", (await camps(B)).includes("Home Game: Act II"), (await camps(B)).join(", "));
    check("device B has the World places, NPCs and monsters", await B.evaluate(() => { worldLoad(); return W.places.length === 2 && npcLoose().some(n => n.name === "Old Tom") && MB.lib.some(m => m.name === "Gloom Hound"); }));
    check("device B isn't offered to add an empty browser", await B.locator("#modal.open").count() === 0);

    // 5. both devices change the same campaign: the second one is asked
    const cid = await B.evaluate(() => Store.list()[0].id);
    await B.evaluate(id => { const c = Store.get(id); c.notes = "from B"; Store.save(c); }, cid);
    await B.waitForTimeout(800); await saved(B);
    await A.evaluate(id => { const c = Store.get(id); c.notes = "from A"; Store.save(c); }, cid);
    await A.waitForSelector("#modal.open", { timeout: 10000 }).catch(() => {});
    check("the second device is asked which version to keep", /changed on another device/.test(await A.textContent("#modalTitle").catch(() => "")));
    await A.click("#modalYes"); await saved(A);
    d = await docs(A);
    check("'Keep this device's' saves A's version", d.docs.find(x => x.id === cid).data.notes === "from A");

    // 6. both devices add a World place at once: both are kept
    await A.evaluate(() => { wpNew({ name: "Alpha Keep", type: "castle" }); worldSave(); });
    await B.evaluate(() => { worldLoad(); wpNew({ name: "Beta Fen", type: "wilderness" }); worldSave(); });
    await A.waitForTimeout(800); await saved(A); await saved(B);
    d = await docs(A);
    const names = (d.docs.find(x => x.id === "world").data.places || []).map(p => p.name);
    check("places added on two devices at once are both kept", names.includes("Alpha Keep") && names.includes("Beta Fen"), names.join(", "));

    // 7. a campaign deleted on B disappears from A on its next visit
    await B.evaluate(() => { const c = blankCampaign("Scratch"); Store.save(c); });
    await B.waitForTimeout(800); await saved(B);
    await A.reload(); await ready(A); await saved(A);
    check("A picks up B's new campaign after a reload", (await camps(A)).includes("Scratch"), (await camps(A)).join(", "));
    await B.evaluate(() => Store.remove(Store.list().find(c => c.name === "Scratch").id)); await B.waitForTimeout(500);
    await A.reload(); await ready(A); await saved(A);
    check("a campaign deleted on B is gone from A", !(await camps(A)).includes("Scratch"), (await camps(A)).join(", "));

    // 8. the connection drops: changes stay on the device and upload later
    await B.route("**/api/me/docs**", r => r.abort());
    await B.evaluate(() => { const c = Store.list().find(c => c.name === "Home Game: Act II"); c.quests = [{ id: "q1", name: "Find the bell", status: "Active" }]; Store.save(c); });
    await B.waitForTimeout(3500);
    check("offline: the change is kept on the device", await B.evaluate(() => Object.keys(Cloud.meta.dirty).length === 1));
    await B.reload(); await ready(B); await B.waitForTimeout(1500);
    check("offline reload: the Tracker still opens with the change", await B.evaluate(() => (Store.list().find(c => c.name === "Home Game: Act II").quests || []).length === 1));
    check("offline reload: the badge says it will upload", /will upload/.test(await B.textContent("#storeBadge")), await B.textContent("#storeBadge"));
    await B.unroute("**/api/me/docs**");
    await B.reload(); await ready(B); await saved(B);
    d = await docs(B);
    // B went offline with a copy older than A's last save (step 5), so its change is kept as a copy, not written over A's
    const copy = d.docs.find(x => x.data && x.data.name === "Home Game: Act II (copy from this device)");
    check("back online: a change made on an out-of-date copy uploads as a copy", !!copy && (copy.data.quests || []).length === 1, d.docs.map(x => x.data && x.data.name).join(", "));
    check("…and the other device's version is left as it was", d.docs.find(x => x.id === cid).data.notes === "from A" && !(d.docs.find(x => x.id === cid).data.quests || []).length);
    // an up-to-date device offline: its change simply uploads
    await B.route("**/api/me/docs**", r => r.abort());
    await B.evaluate(id => { const c = Store.get(id); c.loot = [{ id: "l1", name: "Silver bell" }]; Store.save(c); }, cid);
    await B.waitForTimeout(3500); await B.unroute("**/api/me/docs**");
    await B.reload(); await ready(B); await saved(B);
    d = await docs(B);
    check("back online: a change made offline on an up-to-date copy uploads", (d.docs.find(x => x.id === cid).data.loot || []).length === 1);

    // 9. signing out puts the browser's own work back
    await A.click("#acctBtn"); await A.click('#gate [data-g="out"]'); await A.waitForTimeout(1500); await ready(A);
    check("signed out: the browser's own campaign is back as it was", JSON.stringify(await camps(A)) === JSON.stringify(["Home Game"]), (await camps(A)).join(", "));
    check("signed out: the account's places aren't left in this browser", await A.evaluate(() => { worldLoad(); return W.places.map(p => p.name).join() === "Millbrook"; }));
    check("signed out: nothing set aside or waiting", await A.evaluate(() => !localStorage.getItem("dmforge.stash.v1") && !localStorage.getItem("dmforge.sync.v1")));

    // 10. a player account keeps its browser as it is
    const kitCamp = await B.evaluate(async () => (await (await fetch("/api/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Velmor" }) })).json()));
    const P = await mk("P");
    await P.goto(URL); await ready(P); await P.evaluate(() => Store.save(blankCampaign("Ava's notes"))); await P.waitForTimeout(800);
    await signUp(P, "Ava", "ava@example.com");
    await P.waitForSelector("#jCode"); await P.fill("#jCode", kitCamp.code); await P.fill("#jName", "Ava"); await P.click("#joinForm button[type=submit]");
    await P.waitForSelector("#gate:not(.open)", { state: "attached" }); await P.waitForTimeout(1500);
    check("a player isn't asked to upload a Tracker", await P.locator("#modal.open").count() === 0 || !/browser's work/.test(await P.textContent("#modalTitle")));
    check("a player's account keeps no Tracker", (await docs(P)).docs.length === 0);
    check("nobody else can read the DM's data", !(await docs(P)).docs.some(x => x.data && x.data.name === "Home Game: Act II"));
  } finally {
    check("no page errors", errs.length === 0, errs.join(" | "));
    await browser.close(); srv.kill();
  }
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll account sync checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
