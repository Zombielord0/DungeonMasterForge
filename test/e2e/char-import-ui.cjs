// The Import character window (run from char-import.cjs)
const path = require("path");
module.exports = async (p, { URL, check, FIX }) => {
  const zook = path.join(FIX, "companion-zook.json");
  await p.goto(URL + "#roster"); await p.waitForTimeout(300);
  await p.evaluate(() => { PCS.roster = []; pcPersist(); renderRosterTab(); });
  const hbCount = name => p.evaluate(n => HB.list.filter(x => x.name === n).length, name);
  const open = async () => { await p.click("#impCharBtn"); await p.waitForSelector("#impCharModal.open", { timeout: 3000 }); };
  const choose = async file => { await p.setInputFiles("#impCharFile", file); await p.waitForFunction(() => /Matched|isn't|can't|doesn't/.test(document.querySelector("#impCharOut").textContent), null, { timeout: 15000 }).catch(() => { }); };

  // 1. the button and the window
  check("My Characters has an Import character button", await p.$("#impCharBtn") !== null);
  await open().catch(() => { });
  check("it opens the import window", await p.$("#impCharModal.open") !== null);
  check("the window offers 2014 or 2024 rules, 2014 first", await p.evaluate(() => { const r = document.querySelector('#impCharModal input[name="impEd"]:checked'); return !!r && r.value === "2014"; }));
  check("the window explains how to get the file", /Export|Share/.test(await p.textContent("#impCharModal")));
  check("Import waits for a file", await p.evaluate(() => document.querySelector("#impCharGo").disabled));

  // 2. the summary
  await choose(zook);
  const out = await p.textContent("#impCharOut");
  check("the summary shows what matched", /Matched/.test(out) && /Folk Hero/.test(out), out.slice(0, 300));
  check("the summary lists the new homebrew", /New homebrew/.test(out) && /Swarmkeeper \[UA\]/.test(out) && /Mark of Sentinel Human/.test(out));
  check("the summary lists what couldn't come across", /Not brought across/.test(out) && /Favored/.test(out));
  // 3. import
  await p.click("#impCharGo"); await p.waitForTimeout(600);
  check("Import closes the window", await p.$("#impCharModal.open") === null);
  const ros = await p.evaluate(() => PCS.roster.map(c => [c.name, c.cls, c.level]));
  check("the character is on My Characters", ros.length === 1 && ros[0][0] === "Zook Hornraven", JSON.stringify(ros));
  check("its homebrew is saved", await hbCount("Swarmkeeper [UA]") === 1 && await hbCount("Mark of Sentinel Human") === 1 && await hbCount("Blade Ward") === 1);
  check("the sheet opens on the new character", await p.evaluate(() => { const i = document.querySelector('#rosterMain [data-rf="name"]'); return !!i && i.value === "Zook Hornraven"; }) && /Ranger/.test(await p.textContent("#rosterMain")));
  // 4. importing again doesn't duplicate homebrew
  await open(); await choose(zook);
  check("a second import reuses the homebrew", !/New homebrew/.test(await p.textContent("#impCharOut")));
  await p.click("#impCharGo"); await p.waitForTimeout(600);
  check("no duplicate homebrew after a second import", await hbCount("Swarmkeeper [UA]") === 1);
  // 5. a wrong file
  await open();
  await p.setInputFiles("#impCharFile", { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await p.waitForTimeout(500);
  check("a wrong file says so", /isn't a 5e Companion App character/.test(await p.textContent("#impCharOut")), await p.textContent("#impCharOut"));
  check("a wrong file can't be imported", await p.evaluate(() => document.querySelector("#impCharGo").disabled));
  // 6. cancel
  const before = await p.evaluate(() => PCS.roster.length);
  await choose(zook); await p.click("#impCharCancel"); await p.waitForTimeout(300);
  check("Cancel adds nothing", await p.evaluate(() => PCS.roster.length) === before && await p.$("#impCharModal.open") === null);

  // 7. a signed-in player: new homebrew waits on the character
  await p.evaluate(() => {
    HB.list = HB.list.filter(x => !["Swarmkeeper [UA]", "Mark of Sentinel Human", "Blade Ward"].includes(x.name)); hbApply();
    PCS.roster = []; window.__realPortal = window.Portal;
    window.Portal = { cloud: true, isDM: () => false, changed() { }, ownerTag: () => "", campName: () => "Test", hbPut: () => { throw new Error("players can't write homebrew"); } };
  });
  await open(); await choose(zook);
  check("a player sees that the DM will be asked", /DM will be asked to approve/.test(await p.textContent("#impCharOut")));
  await p.click("#impCharGo"); await p.waitForTimeout(600);
  const pl = await p.evaluate(() => { const c = PCS.roster[0]; return { n: (c && c.hbPending || []).length, list: HB.list.filter(x => x.name === "Swarmkeeper [UA]").length, feats: c ? c.feats.map(f => f.f) : [] }; });
  check("a player's import keeps its new homebrew on the character", pl.n === 3 && pl.list === 0, JSON.stringify(pl));
  check("a player's imported sheet still works", pl.feats.includes("Gathered Swarm"));
  await p.evaluate(() => { window.Portal = window.__realPortal; PCS.roster = []; pcPersist(); hbPendSync(); });
};
