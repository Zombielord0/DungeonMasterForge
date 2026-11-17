// Pending homebrew: a player's imported homebrew works on their character and waits for the DM. Run with:  npm run test:hbpend
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png" };
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
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#roster"); await p.waitForFunction(() => typeof renderHomebrew === "function");

  // a player's imported Ranger with three pending homebrew entries
  await p.evaluate(() => {
    const pend = () => [
      { id: "hb-sw", kind: "subclass", cls: "Ranger", name: "Swarmkeeper [UA]", ed: "2014", desc: "Nature spirits swarm around you.", features: [{ l: 3, n: "Gathered Swarm", d: "A swarm of intangible nature spirits has bonded itself to you.", fx: [] }] },
      { id: "hb-ms", kind: "species", name: "Mark of Sentinel Human", ed: "2014", desc: "", asi: { str: 1, wis: 1 }, speed: 30, skills: [], traits: [{ l: 1, n: "Sentinel's Intuition", d: "Add a d4 to initiative.", fx: [] }], subs: [] },
      { id: "hb-ch", kind: "spell", name: "Cheers", ed: "2014", desc: "Drinks for all.", l: 0, s: "Enchantment", c: ["Ranger"], t: "1 action", r: "30 feet", cp: "V", m: "", du: "Instantaneous", co: false, ri: false, h: "" }];
    const mk = (id, name) => { const c = { id, hbPending: pend() }; PCS.roster.push(c); hbPendSync();
      Object.assign(c, generateCharacter({ seed: id, name, ed: "2014", cls: "Ranger", level: 7, race: "Mark of Sentinel Human", sub: "none", bg: "Folk Hero", subclass: "Swarmkeeper [UA]" }), { id, hbPending: pend(), prepared: [{ n: "Cheers", l: 0, ed: "2014" }] });
      pcEnsure(c); return c; };
    const z = mk("pc-zook", "Zook");
    RC.id = z.id; pcPersist(); renderRosterTab();
  });
  await p.waitForTimeout(300);
  const sheet = await p.textContent("#rosterMain");
  check("the character's pending subclass features are on its sheet", /Gathered Swarm/.test(sheet));
  check("the character's pending species is on its sheet", /Mark of Sentinel Human/.test(sheet));
  check("pending subclass text is readable", await p.evaluate(() => /intangible nature spirits/.test(HB_DESC["Gathered Swarm"] || "")));

  // pending entries stay out of every picker
  const raceOpts = await p.evaluate(() => [...document.querySelectorAll("#pcRace option")].map(o => o.value));
  check("the quick forge doesn't offer a pending species", !raceOpts.includes("Mark of Sentinel Human"), raceOpts.join(","));
  check("the subclass list doesn't offer a pending subclass", await p.evaluate(() => !subclassList("2014", "Ranger").some(x => x[0] === "Swarmkeeper [UA]")));
  check("the spell lists don't offer a pending spell", await p.evaluate(() => { spLoad(); SP.ed = "2014"; $("#spQ").value = "Cheers"; return !spFiltered().some(s => s.n === "Cheers"); }));
  check("the character's own spell list still finds it", await p.evaluate(() => (spellOf("2014", "Cheers") || {}).d === "Drinks for all."));

  // the DM's queue
  await p.goto(URL + "#homebrew"); await p.waitForTimeout(400);
  const queue = () => p.evaluate(() => [...document.querySelectorAll("#hbPendBox [data-pendrow]")].map(e => e.textContent.replace(/\s+/g, " ").trim()));
  let q = await queue();
  check("the Homebrew tab shows a Waiting for approval box", /Waiting for approval/.test(await p.textContent("#hbSide")));
  check("the queue lists all three entries, naming the character", q.length === 3 && q.every(t => /Zook/.test(t)), JSON.stringify(q));

  // approve the subclass
  await p.click('#hbPendBox [data-pendact="ok"][data-pendkey="subclass|ranger|swarmkeeper [ua]"]'); await p.waitForTimeout(400);
  check("approving adds it to the campaign homebrew", await p.evaluate(() => HB.list.some(x => x.kind === "subclass" && x.name === "Swarmkeeper [UA]")));
  check("approving clears it from the character", await p.evaluate(() => !PCS.roster[0].hbPending.some(x => x.kind === "subclass")));
  check("an approved subclass is offered to everyone", await p.evaluate(() => subclassList("2014", "Ranger").some(x => x[0] === "Swarmkeeper [UA]")));
  check("the approved entry has no import bookkeeping", await p.evaluate(() => { const x = HB.list.find(y => y.name === "Swarmkeeper [UA]"); return !("from" in x) && !("pend" in x) && !("rejected" in x); }));

  // reject the spell
  await p.click('#hbPendBox [data-pendact="no"][data-pendkey="spell||cheers"]'); await p.click("#modalYes"); await p.waitForTimeout(400);
  q = await queue();
  check("rejecting marks the character's entry", await p.evaluate(() => PCS.roster[0].hbPending.some(x => x.kind === "spell" && x.rejected)));
  check("a rejected entry leaves the queue", q.length === 1, JSON.stringify(q));
  check("a rejected spell leaves the character's prepared list", await p.evaluate(() => !PCS.roster[0].prepared.some(x => x.n === "Cheers")));

  // a second character with the same pending species: listed once, naming both
  await p.evaluate(() => { const c = JSON.parse(JSON.stringify(PCS.roster[0])); c.id = "pc-two"; c.name = "Two"; c.hbPending = c.hbPending.filter(x => x.kind === "species").map(x => ({ ...x, id: "hb-other" })); PCS.roster.push(c); pcPersist(); renderRoster(); renderHomebrew(); });
  await p.waitForTimeout(300);
  q = await queue();
  check("the same entry from two characters is listed once, naming both", q.length === 1 && /Zook/.test(q[0]) && /Two/.test(q[0]), JSON.stringify(q));
  // approving it clears both characters
  await p.click('#hbPendBox [data-pendact="ok"][data-pendkey="species||mark of sentinel human"]'); await p.waitForTimeout(400);
  check("approving clears the entry from every character", await p.evaluate(() => PCS.roster.every(c => !(c.hbPending || []).some(x => x.kind === "species" && !x.rejected))));
  check("the queue is empty", (await queue()).length === 0);

  // homebrew reloaded from the campaign (the DM approved it on another device) leaves the queue
  await p.evaluate(() => { const c = PCS.roster[0]; c.hbPending = [...(c.hbPending || []), { id: "hb-ig", kind: "feat", name: "Iron Gut", ed: "both", desc: "Hardy.", fx: [] }]; pcPersist(); renderRoster(); renderHomebrew(); });
  await p.waitForTimeout(200);
  check("a new pending entry shows in the queue", (await queue()).length === 1);
  await p.evaluate(() => { hbSet([...HB.list, { id: "hb-ig", kind: "feat", name: "Iron Gut", ed: "both", desc: "Hardy.", fx: [] }]); renderHomebrew(); });
  await p.waitForTimeout(200);
  check("an entry that arrives in the campaign homebrew leaves the queue", (await queue()).length === 0, JSON.stringify(await queue()));

  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll pending homebrew checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
