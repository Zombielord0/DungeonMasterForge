// MythWeaver campaign import. Run with:  npm run test:mythweaver
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public"), FIX = path.join(__dirname, "fixtures");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});
const SAMPLE = fs.readFileSync(path.join(FIX, "mythweaver-sample.json"), "utf8");

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof renderTracker === "function");

  // ---------- reading ----------
  const r = await p.evaluate(txt => { const R = mwRead(JSON.parse(txt)); return R.error ? R : { n: R.campaigns.length, chars: R.characters.length, images: R.images, names: R.campaigns.map(c => c.name), raw: JSON.stringify(R) }; }, SAMPLE);
  check("reads the export's campaigns, characters and picture count", r.n === 2 && r.chars === 1 && r.images === 3 && JSON.stringify(r.names) === '["Ashen Vale","Empty Road"]', JSON.stringify(r).slice(0, 200));
  check("the account's email and name aren't carried", !/nobody@example\.invalid|Fake Person|fakeuser/.test(r.raw || ""));
  const P = await p.evaluate(txt => { const R = mwRead(JSON.parse(txt)); const { camp, stats } = mwPlanCamp(R, 0, null); return { camp, stats }; }, SAMPLE);
  const c = P.camp, npc = n => c.npcs.find(x => x.name === n);
  check("the campaign's name and description", c.name === "Ashen Vale" && /dragon sleeps/.test(c.notes) && c.mwId === "c-ashen", JSON.stringify([c.name, c.notes, c.mwId]));
  check("NPC lore becomes NPCs", c.npcs.length === 2 && P.stats.npcs === 2, JSON.stringify(c.npcs.map(x => x.name)));
  check("an NPC's role comes from its Role section", npc("Hilda Ironhand") && npc("Hilda Ironhand").role === "Blacksmith", JSON.stringify(npc("Hilda Ironhand")));
  check("an NPC's picture link comes across", npc("Hilda Ironhand").imgUrl === "https://assets.example.invalid/hilda.png");
  const os = npc("Brother Oswin") || {};
  check("NPC notes keep sections, mark DM-only ones and drop HTML", /Secret \(DM only\): He serves the dragon/.test(os.notes) && /\*\*old records\*\*/.test(os.notes) && /- Fears fire/.test(os.notes) && !/<p>|<li>/.test(os.notes), JSON.stringify(os.notes));
  check("NPCs and lore keep their MythWeaver ids", c.npcs.every(x => x.mwId) && c.lore.every(x => x.mwId));
  const types = c.lore.map(x => x.type).sort().join(",");
  check("other lore keeps its kind", types === "encounter,item,item,monster,other,other,place", types);
  check("lore not tied to a campaign is added, tagged Account", c.lore.some(x => x.name === "Potion of Greater Healing" && x.tags.includes("Account")));
  check("an entry without a name becomes Untitled", c.lore.some(x => x.name === "Untitled"));
  check("lore sections keep markdown", (c.lore.find(x => x.name === "The Cinder Gate").sections[0] || {}).x === "## Approach\n- Narrow\n- Watched");
  const s1 = c.sessions.find(x => x.num === 1), s2 = c.sessions.find(x => x.num === 2);
  check("sessions come across with number, title and date", s1 && s1.title === "Into the Ash" && s1.date === "2025-02-01" && s2 && s2.title === "Smoke Signals", JSON.stringify(c.sessions));
  check("a session's text is its detailed recap, else its summary", /The party met \*\*Hilda\*\*/.test(s1.summary) && s2.summary === "They found the lambs.");
  check("the stats count what's imported", P.stats.lore === 7 && P.stats.sessions === 2 && !P.stats.updated, JSON.stringify(P.stats));
  check("an empty campaign imports empty", await p.evaluate(txt => { const R = mwRead(JSON.parse(txt)); const { camp } = mwPlanCamp(R, 1, null); return camp.name === "Empty Road" && camp.npcs.length === 0 && camp.sessions.length === 0 && camp.lore.length === 1; }, SAMPLE));
  check("HTML becomes plain text with markdown", await p.evaluate(() => mwText("<p>Hi <strong>there</strong></p><ul><li>a</li></ul>")) === "Hi **there**\n\n- a");
  // the character
  const ch = await p.evaluate(txt => { const R = mwRead(JSON.parse(txt)); const D = mwChar(R.characters[0], "2014"); if (D.error) return D; const { c } = importBuild(D); return { cls: c.cls, level: c.level, race: c.race, bg: c.bg, ed: c.ed, str: c.scores.str, base: c.base.str, skills: c.skills.filter(s => s.p).map(s => s.s), mw: c.mwId }; }, SAMPLE);
  check("a MythWeaver character is built from its choices", ch.cls === "Fighter" && ch.level === 1 && ch.race === "Human" && ch.bg === "Soldier" && ch.ed === "2014", JSON.stringify(ch));
  check("its scores are starting scores, with the species bonus added", ch.base === 15 && ch.str === 16, JSON.stringify(ch));
  check("its class skills come across", ch.skills && ch.skills.includes("Athletics") && ch.skills.includes("Perception"), JSON.stringify(ch.skills));
  check("it remembers where it came from", ch.mw === "ch-brin");
  // importing again updates in place
  const U = await p.evaluate(txt => {
    const R = mwRead(JSON.parse(txt)), first = mwPlanCamp(R, 0, null).camp;
    first.npcs.push({ id: "n-local", name: "Local Guard", role: "Guard", attitude: "Neutral", notes: "" });
    const J = JSON.parse(txt); J.campaigns[0].lore[0].name = "Hilda Ironhand-Stone"; J.campaigns[0].lore.splice(1, 1); // renamed one, removed one
    const R2 = mwRead(J), { camp, stats } = mwPlanCamp(R2, 0, first);
    return { names: camp.npcs.map(x => x.name), id: camp.id === first.id, stats, loreN: camp.lore.length };
  }, SAMPLE);
  check("importing again keeps what the DM added", U.names.includes("Local Guard"), JSON.stringify(U.names));
  check("importing again updates matching entries", U.names.includes("Hilda Ironhand-Stone") && !U.names.includes("Hilda Ironhand"), JSON.stringify(U.names));
  check("importing again never deletes", U.names.includes("Brother Oswin") && U.names.length === 3, JSON.stringify(U.names));
  check("importing again keeps the same campaign and no duplicates", U.id && U.stats.updated && U.loreN === 7, JSON.stringify(U));
  const bad = await p.evaluate(() => mwRead({ foo: 1 }));
  check("a file that isn't a MythWeaver export is refused", /isn't a MythWeaver export/.test(bad.error || ""), JSON.stringify(bad));

  const UI = path.join(__dirname, "mythweaver-ui.cjs"); // the window checks (added with the window)
  if (fs.existsSync(UI)) await require(UI)(p, { URL, check, FIX, browser });
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll MythWeaver checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
