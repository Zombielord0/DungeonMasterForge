// Campaign export/import carries custom items, homebrew and custom monsters. Run with:  npm run test:campextras
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

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const errs = [];
  const open = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true, serviceWorkers: "block" });
    await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
    await p.goto(URL + "#tracker");
    await p.waitForFunction(() => typeof campExtras === "function" && $("#storeBadge").textContent !== "Connecting…", null, { timeout: 15000 });
    return { ctx, p };
  };

  // --- the DM's browser: a custom item, a homebrew feat, a custom monster and a campaign with the item as loot
  const A = await open();
  await A.p.evaluate(async () => {
    const d = ciNew(); d.n = "Blade of Test Fire"; IT.draft = d; ciSave();
    const h = hbItemOf(Object.assign(hbNew("feat"), { name: "Testers Grit" })); await hbPut(h);
    const m = mbBlank(); m.name = "Test Gremlin"; MB.lib.push(m); mbSaveLib();
  });
  await A.p.click("#newCamp"); await A.p.waitForTimeout(400);
  await A.p.evaluate(() => { const c = curCamp(); c.name = "Extras Camp"; c.loot.unshift({ id: uid("l"), item: "Blade of Test Fire", holder: "", value: "", notes: "" }); Store.save(c); renderTracker(); });
  await A.p.waitForTimeout(300);
  const [dl] = await Promise.all([A.p.waitForEvent("download"), A.p.click("#exportCamp")]);
  const file = path.join(require("os").tmpdir(), "dmforge-camp-extras.json");
  await dl.saveAs(file);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  check("export carries the custom item", (json.extras?.items || []).some(x => x.n === "Blade of Test Fire"));
  check("export carries homebrew", (json.extras?.homebrew || []).some(x => x.name === "Testers Grit"));
  check("export carries custom monsters", (json.extras?.monsters || []).some(x => x.name === "Test Gremlin"));

  // --- a fresh browser: import the file
  const B = await open();
  await B.p.evaluate(() => { currentPC = pcEnsure(generateCharacter({ seed: "CX1", name: "Hero One", ed: "2024" })); keepPC(); });
  await B.p.setInputFiles("#importFile", file); await B.p.waitForTimeout(800);
  let st = await B.p.evaluate(() => ({ items: IT.custom.map(x => x.n), hb: HB.list.map(x => x.name), mons: MB.lib.map(x => x.name), camps: Store.list().map(c => ({ name: c.name, extras: "extras" in c })), toast: $("#toast") ? $("#toast").textContent : "" }));
  check("custom item added to Items", st.items.includes("Blade of Test Fire"), JSON.stringify(st.items));
  check("homebrew added", st.hb.includes("Testers Grit"), JSON.stringify(st.hb));
  check("custom monster added", st.mons.includes("Test Gremlin"), JSON.stringify(st.mons));
  check("campaign imported without the extras field", st.camps.some(c => c.name === "Extras Camp" && !c.extras), JSON.stringify(st.camps));
  check("toast says what came along", /custom item/.test(st.toast), st.toast);

  // importing again doesn't add duplicates
  await B.p.setInputFiles("#importFile", file); await B.p.waitForTimeout(800);
  st = await B.p.evaluate(() => ({ items: IT.custom.length, hb: HB.list.length, mons: MB.lib.length }));
  check("second import adds no duplicates", st.items === 1 && st.hb === 1 && st.mons === 1, JSON.stringify(st));

  // the item can be given to a character from the Items tab
  await B.p.goto(URL + "#items"); await B.p.waitForFunction(() => typeof itGive === "function");
  const given = await B.p.evaluate(() => { const x = IT.custom.find(y => y.n === "Blade of Test Fire"); const c = PCS.roster[0]; $("#itTarget").value = c.id; itGive(x, true); const inv = PCS.roster[0].inv.find(i => i.n === "Blade of Test Fire"); return inv && inv.ref === x.id; });
  check("custom item given to a character with a link to the item", given);

  // and the loot row's Give to… links to the custom item too
  const lootRef = await B.p.evaluate(() => {
    const camp = Store.list().find(c => c.name === "Extras Camp"); activeId = camp.id; const it = camp.loot[0];
    const p = PCS.roster[0]; p.inv = p.inv.filter(i => i.n !== "Blade of Test Fire");
    const sel = document.createElement("select"); sel.dataset.lootgive = it.id; sel.innerHTML = `<option value="${p.id}">x</option>`; document.body.append(sel); sel.value = p.id;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    const inv = PCS.roster[0].inv.find(i => i.n === "Blade of Test Fire"); return inv && /^ci/.test(inv.ref || "");
  });
  check("loot Give to… links the custom item", lootRef);

  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
