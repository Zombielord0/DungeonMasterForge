// The Import campaign window (run from mythweaver.cjs)
const path = require("path"), fs = require("fs");
module.exports = async (p, { URL, check, FIX, browser }) => {
  const sample = path.join(FIX, "mythweaver-sample.json");
  await p.goto(URL + "#tracker"); await p.waitForTimeout(300);
  await p.evaluate(() => { [...Store.list()].forEach(c => Store.remove(c.id)); PCS.roster = []; pcPersist(); renderTracker(); renderRoster(); });
  await p.waitForTimeout(300);
  const btnTxt = await p.evaluate(() => document.getElementById("importFile").closest("label").textContent.trim());
  check("the Tracker button says Import campaign", /Import campaign/.test(btnTxt), btnTxt);
  // a Forge campaign file still imports as before
  const forge = JSON.stringify({ ...JSON.parse('{"name":"Forge Camp","npcs":[{"id":"n1","name":"Bob","role":"","attitude":"Unknown","notes":""}]}') });
  await p.setInputFiles("#importFile", { name: "camp.json", mimeType: "application/json", buffer: Buffer.from(forge) }); await p.waitForTimeout(400);
  check("a Forge campaign file still imports", await p.evaluate(() => Store.list().some(c => c.name === "Forge Camp")) && /Campaign imported/.test(await p.textContent("#toast")));
  // a MythWeaver export opens the window
  await p.setInputFiles("#importFile", sample); await p.waitForTimeout(500);
  check("a MythWeaver export opens the import window", await p.$("#impCampModal.open") !== null);
  const txt = (await p.textContent("#impCampModal")).replace(/\s+/g, " ");
  check("the window lists both campaigns with counts", /Ashen Vale/.test(txt) && /Empty Road/.test(txt) && /2 NPCs/.test(txt) && /2 sessions/.test(txt), txt.slice(0, 400));
  check("the window lists the character", /Brin Ashford/.test(txt) && /Fighter 1/.test(txt));
  check("campaigns and characters start ticked", await p.evaluate(() => [...document.querySelectorAll("[data-mwcamp],[data-mwchar]")].every(b => b.checked)));
  check("the window shows the size and the pictures it leaves out", /MB/.test(txt) && /3 MythWeaver pictures aren't imported/.test(txt), txt.slice(-300));
  // import
  await p.click("#impCampGo"); await p.waitForTimeout(800);
  check("Import closes the window", await p.$("#impCampModal.open") === null);
  const st = await p.evaluate(() => ({ camps: Store.list().map(c => c.name).sort(), lore: (Store.list().find(c => c.name === "Ashen Vale") || {}).lore, chars: PCS.roster.map(c => c.name), ls: Object.keys(localStorage).map(k => localStorage.getItem(k)).join("") }));
  check("both campaigns are in the Tracker", JSON.stringify(st.camps) === '["Ashen Vale","Empty Road","Forge Camp"]', JSON.stringify(st.camps));
  check("the Lore tab is filled", st.lore && st.lore.length === 7);
  check("the character is on My Characters", JSON.stringify(st.chars) === '["Brin Ashford"]', JSON.stringify(st.chars));
  check("the account's email isn't saved anywhere", !/nobody@example\.invalid|Fake Person/.test(st.ls));
  // importing again updates
  await p.setInputFiles("#importFile", sample); await p.waitForTimeout(500);
  check("importing again says it will update", /Updates Ashen Vale/.test(await p.textContent("#impCampModal")));
  await p.click("#impCampGo"); await p.waitForTimeout(800);
  const st2 = await p.evaluate(() => ({ n: Store.list().filter(c => c.name === "Ashen Vale").length, chars: PCS.roster.length }));
  check("importing again doesn't duplicate campaigns or characters", st2.n === 1 && st2.chars === 1, JSON.stringify(st2));
  // a full browser rolls back
  await p.evaluate(() => { const c = Store.list().find(x => x.name === "Ashen Vale"); Store.remove(c.id); });
  await p.waitForTimeout(300);
  const before = await p.evaluate(() => Store.list().map(c => c.name).sort());
  await p.evaluate(() => { window.__set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "dmforge.campaigns.v1" && String(v).length > 2000) throw new DOMException("full", "QuotaExceededError"); return window.__set.call(this, k, v); }; });
  await p.setInputFiles("#importFile", sample); await p.waitForTimeout(500);
  await p.click("#impCampGo"); await p.waitForTimeout(800);
  check("a full browser says there isn't room", /There isn.t room/.test(await p.textContent("#impCampModal")), await p.textContent("#impCampOut"));
  check("nothing is half-imported", JSON.stringify(await p.evaluate(() => Store.list().map(c => c.name).sort())) === JSON.stringify(before));
  await p.evaluate(() => { Storage.prototype.setItem = window.__set; }); await p.click("#impCampCancel");
  // phone: the Import button is on screen
  const ctx = await browser.newContext({ viewport: { width: 390, height: 640 }, serviceWorkers: "block", hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const q = await ctx.newPage(); await q.goto(URL + "#tracker"); await q.waitForFunction(() => typeof renderTracker === "function");
  await q.setInputFiles("#importFile", sample); await q.waitForTimeout(500);
  const r = await q.evaluate(() => { const b = document.getElementById("impCampGo"); if (!b) return null; const x = b.getBoundingClientRect(); return [Math.round(x.top), Math.round(x.bottom), innerHeight]; });
  check("phone: the Import button is on screen", r && r[0] >= 0 && r[1] <= r[2], JSON.stringify(r));
  check("phone: the window doesn't scroll sideways", await q.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await ctx.close();
};
