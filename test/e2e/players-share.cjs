// What the DM shares with players: the Journal, the turn order on their phones, and players' shared rolls. Run with:  npm run test:share
// Builds the portal with the stand-in sign-in and starts the local copy (app + API + in-memory database) on port 8895.
const { spawn } = require("child_process"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", ".."), PORT = 8895, URL = `http://localhost:${PORT}/`;
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
(async () => {
  require("esbuild").buildSync({ absWorkingDir: ROOT, entryPoints: ["src/portal.js"], bundle: true, format: "esm", alias: { "@netlify/identity": "./test/e2e/fake-identity.js" }, outfile: ".dev/portal-share.js", logLevel: "warning" });
  const srv = spawn(process.execPath, ["test/e2e/server.mjs", ".dev/portal-share.js", String(PORT)], { cwd: ROOT });
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
    const activity = p => p.evaluate(async () => { const me = await (await fetch("/api/me")).json(); return (await (await fetch(`/api/campaigns/${me.campaigns[0].id}/activity`)).json()).map(a => a.summary); });

    // a DM with a campaign, and a player with a character in it
    const dm = await mk("dm");
    await signUp(dm, "Kit", "kit@example.com"); await dm.waitForSelector("#dmForm");
    await dm.fill("#dCamp", "Velmor"); await dm.click("#dmForm button[type=submit]");
    await dm.waitForFunction(() => Portal.cloud && Portal.isDM(), null, { timeout: 15000 });
    const code = await dm.evaluate(async () => (await (await fetch("/api/me")).json()).campaigns[0].code);
    const pl = await mk("player", true);
    await signUp(pl, "Pia", "pia@example.com"); await pl.waitForSelector("#jCode");
    await pl.fill("#jCode", code); await pl.fill("#jName", "Pia"); await pl.click("#joinForm button[type=submit]");
    await pl.waitForFunction(() => Portal.cloud && /Shared with campaign/.test(document.getElementById("storeBadge").textContent), null, { timeout: 15000 });
    await pl.evaluate(() => { currentPC = pcEnsure(generateCharacter({ seed: "PIA", name: "Pia Wren", ed: "2024", cls: "Rogue" })); keepPC(); });
    await dm.waitForFunction(() => Store.list().some(c => c.name === "Velmor" && (c.party || []).some(p => p.name === "Pia Wren")), null, { timeout: 20000 });
    check("the player's character joins the party's Tracker campaign", true);

    // 1. the Journal
    check("players have a Journal tab (in the phone's tab menu too)", await pl.evaluate(() => !document.querySelector('nav a[data-view="journal"]').hidden && !document.querySelector('#fside [data-row-of="journal"]').hidden));
    await dm.evaluate(() => {
      const c = Store.list().find(c => c.name === "Velmor");
      c.quests = [{ id: "q1", title: "Find the silver bell", status: "Active", giver: "Mother Rue", notes: "SECRET: the bell is cursed" }, { id: "q2", title: "Unmask the traitor", status: "Active", players: "No" }, { id: "q3", title: "Clear the mill", status: "Completed" }];
      c.sessions = [{ id: "s1", title: "Session 1: Ashes", num: 1, date: "2026-11-10", summary: "The party reached **Velmor**." }, { id: "s2", title: "Prep notes", players: "No", summary: "secret plans" }];
      c.lore = [{ id: "l1", name: "The Bell Tower", type: "place", tags: ["Velmor"], desc: "An old tower.", shared: true, sections: [{ t: "History", x: "Built by monks.", dm: false }, { t: "Truth", x: "A lich lives below.", dm: true }] },
        { id: "l2", name: "The Lich", type: "monster", desc: "Hidden villain.", sections: [] }];
      Store.save(c);
    });
    await dm.waitForTimeout(5500);
    await pl.reload(); await ready(pl); await pl.waitForFunction(() => Portal.cloud);
    await pl.goto(URL + "#journal"); await pl.waitForFunction(() => /silver bell/.test(document.getElementById("journalMain").textContent), null, { timeout: 35000 }).catch(() => {});
    const J = await pl.textContent("#journalMain");
    check("the Journal shows the quests and who gave them", /Find the silver bell/.test(J) && /Mother Rue/.test(J), J.slice(0, 300));
    check("…not quests set to 'Players see it: No', nor quest notes", !/Unmask the traitor/.test(J) && !/SECRET/.test(J));
    check("finished quests are listed apart", /Finished \(1\)/.test(J));
    check("session recaps show, formatted; hidden ones don't", /Session 1: Ashes/.test(J) && !/Prep notes/.test(J) && !/secret plans/.test(J) && await pl.locator("#journalMain strong", { hasText: "Velmor" }).count() === 1);
    check("shared Lore shows without its DM-only sections", /The Bell Tower/.test(J) && /Built by monks/.test(J) && !/lich lives below/i.test(J), J);
    check("Lore that isn't shared stays hidden", !/Hidden villain/.test(J) && !/The Lich\b/.test(J));
    await dm.goto(URL + "#journal"); await dm.waitForSelector("#journalMain .j-h");
    check("the DM can preview what players see", /This is what your players see/.test(await dm.textContent("#journalMain")) && /Find the silver bell/.test(await dm.textContent("#journalMain")) && !/Unmask/.test(await dm.textContent("#journalMain")));

    // The linked DM campaign publishes its source settings and only revealed handouts.
    await dm.evaluate(() => { activeId = Store.list()[0].id; location.hash = "tracker"; renderTracker(); });
    await dm.locator('[data-sub="sources"]').click();
    await dm.locator('#campaignSources select[name="edition"]').selectOption("2014");
    await dm.locator('#campaignSources input[type="checkbox"]').evaluateAll(boxes => boxes.forEach(box => { box.checked = false; }));
    await dm.locator('#campaignSources button[type="submit"]').click();
    check("existing characters outside the edition are flagged", /Pia Wren.*2024 rules/s.test(await dm.locator("#campaignSources").innerText()));
    await dm.locator('[data-sub="handouts"]').click();
    const handoutForm = dm.locator("#journalHandoutForm");
    await handoutForm.locator('input[name="title"]').fill("A sealed letter");
    await handoutForm.locator('textarea[name="text"]').fill("Meet at **the old mill**.");
    const png = await dm.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 8; canvas.height = 8;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#12a345"; ctx.fillRect(0, 0, 8, 8);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await handoutForm.locator('input[name="picture"]').setInputFiles({ name: "letter.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    await handoutForm.locator("button").click();
    await dm.waitForSelector("[data-journal-reveal]", { state: "attached" });
    check("a new handout starts hidden", await dm.evaluate(() => journalFor(curCamp()).handouts.length === 0));
    await dm.locator("details.lore-card summary", { hasText: "A sealed letter" }).click();
    await dm.locator("[data-journal-reveal]").click();
    await dm.waitForTimeout(5000);
    await pl.reload(); await ready(pl);
    await pl.goto(URL + "#journal");
    await pl.waitForSelector(".j-handout", { timeout: 20000 });
    await pl.locator(".j-handout summary").click();
    await pl.waitForFunction(() => document.querySelector(".j-handout img")?.naturalWidth > 0);
    check("the player can reopen the revealed clue and its picture", await pl.locator(".j-handout strong").innerText() === "the old mill");
    await pl.goto(URL + "#compendium");
    await pl.waitForFunction(() => document.querySelector("#compendiumEdition").disabled);
    check("the player gets the campaign's edition and source filters", await pl.evaluate(() => currentSourceRules()?.edition === "2014" && !currentSourceRules().books.length && !currentSourceRules().homebrew));
    await pl.waitForFunction(() => compendium.rows[0]?.ed === "2014");
    check("the player can browse without typing and sees only allowed entries", await pl.evaluate(() =>
      document.getElementById("compendiumQuery").value === ""
      && document.querySelector('#compendiumType option[value="Monster"]').hidden
      && compendium.rows.every(row => row.ed === "2014" && row.kind !== "Monster" && row.source === "SRD 5.1")));
    await pl.goto(URL + "#roster");
    check("the player's character builder uses the campaign edition", await pl.locator('input[name="pcEd"][value="2014"]').isChecked() && await pl.locator('input[name="pcEd"][value="2024"]').isDisabled());
    await dm.locator("details.lore-card summary", { hasText: "A sealed letter" }).click();
    await dm.locator("[data-journal-reveal]").click();
    check("hiding a handout removes it from the published journal", await dm.evaluate(() => journalFor(curCamp()).handouts.length === 0));

    // 2. turn order on phones
    await dm.evaluate(() => {
      const c = Store.list().find(c => c.name === "Velmor"), pia = c.party.find(p => p.name === "Pia Wren");
      c.encounters = [{ id: "e1", name: "Ambush at the mill", status: "Running", level: 1, enemies: [{ id: "m1", name: "Goblin", hp: 3, max: 7, ac: 15, init: 15 }], round: 1, turn: "m1", pcInit: { [pia.id]: 10 }, notes: "" }];
      Store.save(c); activeId = c.id; subTab = "encounters"; location.hash = "tracker"; renderTracker();
    });
    await dm.waitForSelector('[data-ea="players"]');
    await dm.click('[data-ea="players"]');
    check("the DM's button switches to 'Off players' phones'", /Off players/.test(await dm.textContent('[data-ea="players"]')));
    await dm.waitForTimeout(5000);
    await pl.reload(); await ready(pl);
    await pl.waitForSelector("#turnBar:not([hidden])", { timeout: 15000 }).catch(() => {});
    let bar = await pl.textContent("#turnBar").catch(() => "");
    check("the player sees the fight, the round and whose turn it is", /Ambush at the mill/.test(bar) && /Round 1/.test(bar) && /Now: Goblin/.test(bar) && /Next: Pia Wren/.test(bar), bar);
    await pl.click("#turnBar summary"); bar = await pl.textContent("#turnBar");
    check("…with Bloodied, never HP numbers", /Goblin · Bloodied/.test(bar) && !/\b3\b|\b7\b|HP/.test(bar.replace(/Round \d+/, "")), bar);
    await dm.evaluate(() => { const c = Store.list().find(c => c.name === "Velmor"), e = c.encounters[0]; e.turn = c.party.find(p => p.name === "Pia Wren").id; Store.save(c); });
    await pl.waitForFunction(() => /Your turn!/.test(document.getElementById("turnBar").textContent), null, { timeout: 15000 }).catch(() => {});
    check("on their character's turn the bar says 'Your turn!'", /Your turn!/.test(await pl.textContent("#turnBar")) && await pl.evaluate(() => document.getElementById("turnBar").classList.contains("yours")));
    check("the turn bar stays open when it updates", await pl.locator("#turnBar details[open]").count() === 1);
    await dm.evaluate(() => { renderTracker(); }); await dm.click('[data-ea="players"]');
    await pl.waitForFunction(() => document.getElementById("turnBar").hidden, null, { timeout: 15000 }).catch(() => {});
    check("taking it off players' phones hides the bar", await pl.evaluate(() => document.getElementById("turnBar").hidden));

    // 3. shared rolls
    await pl.goto(URL + "#roster"); await pl.waitForSelector("[data-roll]");
    await pl.locator("[data-roll]").first().click(); await pl.waitForTimeout(1200);
    check("rolls stay private until the player ticks the box", !(await activity(dm)).some(s => /🎲/.test(s)));
    await pl.click("[data-rdtoggle]"); await pl.waitForSelector("[data-rdshare]");
    check("the roll dock offers 'Share my rolls with the DM', off at first", !(await pl.isChecked("[data-rdshare]")));
    await pl.check("[data-rdshare]");
    await pl.locator("[data-roll]").first().click(); await pl.waitForTimeout(1200);
    const feed = await activity(dm);
    check("a shared roll shows in the DM's activity feed", feed.some(s => /^🎲 .+: \d+/.test(s)), feed.join(" | "));
    check("the DM's own sheets have no share box", !(await dm.evaluate(() => rollShareHTML())));
    // 4. another member's sheet can't run page code in the DM's browser, whatever its fields hold
    check("a forced save (Keep mine) is accepted by the server", (await pl.evaluate(async () => {
      const me = await (await fetch("/api/me")).json(), camp = me.campaigns[0].id, c = JSON.parse(JSON.stringify(PCS.roster[0]));
      const X = '<img src=x class="pwn" onerror="window.__pwned=1">';
      Object.assign(c, { name: "Pia " + X, ed: X, race: X, bg: X, notes: 'She said "hi" ' + X, formHp: '1">' + X, active: { "Wild Shape": "x" } });
      const r = await fetch(`/api/campaigns/${camp}/characters/${encodeURIComponent(c.id)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: c, force: true }) });
      return r.status;
    })) === 200);
    await dm.reload(); await dm.waitForFunction(() => Portal.cloud && PCS.roster.length > 0, null, { timeout: 15000 });
    await dm.evaluate(() => { location.hash = "#roster"; }); await dm.waitForTimeout(300);
    await dm.evaluate(() => { RC.id = PCS.roster.find(c => /^Pia/.test(c.name)).id; renderRosterTab(); }); await dm.waitForTimeout(400);
    check("a player's booby-trapped sheet runs no code in the DM's browser", await dm.evaluate(() => !window.__pwned && !document.querySelector("img.pwn")));
    check("…and still opens, its text exactly as the player wrote it, with nothing able to run", await dm.evaluate(() => { const c = PCS.roster.find(c => /^Pia/.test(c.name)); return /^Pia <img/.test(c.name) && /She said "hi"/.test(c.notes) && !!document.querySelector('#rosterMain [data-rf="name"]') && ![...document.querySelectorAll("*")].some(e => [...e.attributes].some(a => /^on/i.test(a.name) && e.closest("#rosterMain, #rosterList"))); }));
    // the other way round: the DM edits the player's sheet; the player's browser must not trust it just because it's theirs
    check("the DM's forced edit of the player's sheet is accepted", (await dm.evaluate(async () => {
      const me = await (await fetch("/api/me")).json(), camp = me.campaigns[0].id, c = JSON.parse(JSON.stringify(PCS.roster.find(c => /^Pia/.test(c.name))));
      c.rollLog = [{ t: Date.now(), label: "x", total: '<img src=x class="pwn" onerror="window.__pwned=1">', d: ['<img src=x class="pwn" onerror="window.__pwned=1">'], bonus: '<img src=x class="pwn">' }];
      return (await fetch(`/api/campaigns/${camp}/characters/${encodeURIComponent(c.id)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: c, force: true }) })).status;
    })) === 200);
    await pl.reload(); await pl.waitForFunction(() => Portal.cloud && PCS.roster.length > 0, null, { timeout: 15000 });
    await pl.evaluate(() => { location.hash = "#roster"; RC.id = PCS.roster[0].id; ROLL.open = true; renderRosterTab(); }); await pl.waitForTimeout(400);
    check("a sheet the DM edited runs no code in the player's browser", await pl.evaluate(() => !window.__pwned && !document.querySelector("img.pwn")));
    // the player's own save, last written by them, stays exactly as typed
    await pl.evaluate(() => { const c = PCS.roster[0]; c.notes = 'She said "hi"'; c.rollLog = []; pcPersist(); });
    await pl.waitForTimeout(2500);
    await pl.reload(); await pl.waitForFunction(() => Portal.cloud && PCS.roster.length > 0, null, { timeout: 15000 });
    check("the player's own copy keeps their text exactly", await pl.evaluate(() => /She said "hi"/.test(PCS.roster[0].notes || "")), await pl.evaluate(() => PCS.roster[0].notes));
  } finally {
    check("no page errors", errs.length === 0, errs.join(" | "));
    await browser.close(); srv.kill();
  }
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll sharing checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
