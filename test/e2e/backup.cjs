// Backup and restore checks. Run with:  npm run test:backup
// Starts its own static server for public/ on a free port; uses the "Use without an account" mode.
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json" };

let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});

// the saved items a backup must carry (filled in from real app data below)
const KEYS = ["dmforge.pcs.v1", "dmforge.campaigns.v1", "dmforge.favspells", "dmforge.fog.v1"];
let SAMPLE = {};

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  const ready = () => p.waitForFunction(() => typeof saveFile === "function" && $("#storeBadge").textContent !== "Connecting…", null, { timeout: 15000 }).catch(e => { console.log("page errors:", errs.join(" | ")); throw e; });
  await p.goto(URL); await ready();
  // make real data the way a user would: two characters, a campaign, a favourite spell and some map fog
  await p.evaluate(() => {
    for (const i of [1, 2]) { currentPC = pcEnsure(generateCharacter({ seed: "BK" + i, name: "Hero " + i, ed: "2024" })); keepPC(); }
    localStorage.setItem("dmforge.favspells", JSON.stringify(["Shield"]));
    localStorage.setItem("dmforge.fog.v1", JSON.stringify({ "gen|X|crypt|medium|10": { f: "01,", s: [], t: 1 } }));
  });
  await p.goto(URL + "#tracker"); await ready(); await p.click("#newCamp"); await p.waitForTimeout(1200);
  await p.goto(URL); await ready();
  SAMPLE = await p.evaluate(keys => Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)])), KEYS);
  check("test data was created", Object.values(SAMPLE).every(v => v) && JSON.parse(SAMPLE["dmforge.pcs.v1"]).roster.length === 2, JSON.stringify(Object.keys(SAMPLE).filter(k => !SAMPLE[k])));

  // downloads work on a normal website (not only inside Claude)
  const [dl0] = await Promise.all([p.waitForEvent("download", { timeout: 5000 }).catch(() => null), p.evaluate(() => saveFile("hello.json", "{}"))]);
  check("downloads work outside Claude", !!dl0 && dl0.suggestedFilename() === "hello.json");

  check("Backup button shows when saving in this browser", await p.isVisible("#backupBtn"));
  await p.click("#backupBtn");
  check("Backup window opens", await p.isVisible("#backupModal"));
  check("Backup window counts characters and campaigns", /2 characters/.test(await p.textContent("#backupInfo")) && /1 campaign\b/.test(await p.textContent("#backupInfo")));

  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 5000 }).catch(() => null), p.click("#backupDownload")]);
  check("Download backup saves a file", !!dl);
  const file = dl && await dl.path();
  const bk = file ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  check("backup file name has the date", !!dl && /^forge-backup-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), dl && dl.suggestedFilename());
  check("backup is marked as a Forge backup", bk.app === "dmforge-backup" && bk.v === 1 && !!bk.made);
  check("backup holds every saved item exactly", Object.keys(SAMPLE).every(k => bk.data && bk.data[k] === SAMPLE[k]));
  check("backup leaves out settings like offline mode", bk.data && !("dmforge.offline" in bk.data));
  check("Backup window remembers the last backup", /Last backup: (today|\d)/.test(await p.textContent("#backupInfo")));

  // restore: change things, then restore the file
  await p.evaluate(() => { localStorage.setItem("dmforge.pcs.v1", JSON.stringify({ cur: null, roster: [], updated: 2 })); localStorage.removeItem("dmforge.favspells"); });
  const bkNoItems = { ...bk, data: { ...bk.data } }; delete bkNoItems.data["dmforge.fog.v1"];
  const f2 = path.join(require("os").tmpdir(), "forge-restore-test.json"); fs.writeFileSync(f2, JSON.stringify(bkNoItems));
  await p.setInputFiles("#backupFile", f2);
  await p.waitForSelector("#modal.open");
  check("restore asks before replacing anything", /Replace/.test(await p.textContent("#modalMsg")));
  await Promise.all([p.waitForEvent("load"), p.click("#modalYes")]); await ready();
  const after = await p.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith("dmforge.")).map(k => [k, localStorage.getItem(k)])));
  check("restore brings back the characters", after["dmforge.pcs.v1"] === SAMPLE["dmforge.pcs.v1"]);
  check("restore brings back favourite spells that were deleted", after["dmforge.favspells"] === SAMPLE["dmforge.favspells"]);
  check("restore removes saved data the backup didn't have", !("dmforge.fog.v1" in after));
  check("restore keeps this browser's settings", after["dmforge.offline"] === "1");
  check("restored characters appear in the app", await p.evaluate(() => PCS.roster.length === 2));

  // a file that isn't a backup changes nothing
  const f3 = path.join(require("os").tmpdir(), "forge-not-backup.json"); fs.writeFileSync(f3, JSON.stringify({ hello: 1 }));
  await p.click("#backupBtn"); await p.setInputFiles("#backupFile", f3); await p.waitForTimeout(300);
  check("a non-backup file is refused", /isn't a Forge backup/.test(await p.textContent("#toast")) && !(await p.isVisible("#modal.open")));
  check("refused file changed nothing", await p.evaluate(s => localStorage.getItem("dmforge.pcs.v1") === s, SAMPLE["dmforge.pcs.v1"]));
  // cancelling a restore changes nothing
  const f4 = path.join(require("os").tmpdir(), "forge-restore-cancel.json"); fs.writeFileSync(f4, JSON.stringify({ ...bk, data: { "dmforge.pcs.v1": "{\"roster\":[]}" } }));
  await p.setInputFiles("#backupFile", f4); await p.waitForSelector("#modal.open"); await p.click("#modalNo");
  check("cancelling a restore changes nothing", await p.evaluate(s => localStorage.getItem("dmforge.pcs.v1") === s, SAMPLE["dmforge.pcs.v1"]));

  // signed in: everything is saved to the account, so the button is hidden
  check("Backup button hides when saving to an account", await p.evaluate(() => { Store.mode = "db"; setBadge(); const h = $("#backupBtn").hidden; Store.mode = "local"; setBadge(); return h; }));

  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll backup checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
