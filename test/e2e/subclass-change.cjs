// Change a character's subclass from the sheet (2026-11-23): for example from an old homebrew copy to the real one.
// Run with:  npm run test:subchange
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".webp": "image/webp" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const browser = await chromium.launch();
  for (const [w, h, size] of [[1400, 1000, "laptop"], [390, 844, "phone"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: "block" });
    await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    const p = await ctx.newPage(), errs = []; p.on("pageerror", e => errs.push(e.message));
    await p.goto(`http://localhost:${server.address().port}/#roster`); await p.waitForFunction(() => typeof generateCharacter === "function");
    // a Paladin 8 stuck on an old homebrew copy an earlier import made ("OathBreaker", no real features)
    const before = await p.evaluate(() => {
      HB.list.push({ id: "hb-old-ob", kind: "subclass", src: "Fifth Edition Character Sheet", ed: "2014", cls: "Paladin", name: "OathBreaker", desc: "", features: [{ l: 3, n: "Old Copy Feature", d: "" }] }); hbApply();
      const c = generateCharacter({ cls: "Paladin", level: 8, ed: "2014", seed: "subchange", subclass: "OathBreaker", method: "array", bonus: "flex" }) /* as the forge makes it */; c.id = "pc-subchange"; c.name = "Buster";
      PCS.roster.unshift(c); RC.id = c.id; pcPersist(); renderRosterTab();
      return { sub: c.subclass, scores: JSON.stringify(Object.keys(c.scores).sort().map(k => [k, c.scores[k]])), lv: c.level, feats: c.feats.map(f => f.f) };
    });
    check(`${size}: the test character starts on the old homebrew copy`, before.sub === "OathBreaker" && before.feats.includes("Old Copy Feature"), JSON.stringify(before));

    const btn = p.locator('#rosterMain [data-subchange="pc-subchange"]');
    check(`${size}: the sheet offers Change next to the subclass`, await btn.count() === 1 && /Change/.test(await btn.first().innerText()));
    // Cancel changes nothing
    await btn.first().click(); await p.locator("#lvModal.open").waitFor();
    const listed = await p.evaluate(() => [...document.querySelectorAll("#lvModal [data-lvsub]")].map(b => b.dataset.lvsub));
    check(`${size}: the picker lists built-in, book and homebrew subclasses`, ["Oath of Devotion", "Oathbreaker", "OathBreaker"].every(n => listed.includes(n)), JSON.stringify(listed.slice(0, 12)));
    await p.click("#lvModal [data-lvno]");
    check(`${size}: Cancel keeps the subclass`, await p.evaluate(() => pcById("pc-subchange").subclass) === "OathBreaker");
    // pick the real Oathbreaker (with the character hurt: 10 HP down, which a subclass change must not heal)
    await p.evaluate(() => { const c = pcById("pc-subchange"); c.hpCur = c.hp - 10; c.hpWas = c.hpCur; pcPersist(); });
    await btn.first().click(); await p.locator("#lvModal.open").waitFor();
    await p.click('#lvModal [data-lvsub="Oathbreaker"]'); await p.click("#lvModal [data-lvyes]");
    await p.waitForTimeout(300);
    const after = await p.evaluate(() => { const c = pcById("pc-subchange"); return { hpCur: c.hpCur, hpWas: c.hpWas, sub: c.subclass, scores: JSON.stringify(Object.keys(c.scores).sort().map(k => [k, c.scores[k]])), lv: c.level, name: c.name, feats: c.feats.map(f => f.f), shown: document.querySelector("#rosterMain").textContent.includes("Aura of Hate"), saved: (JSON.parse(localStorage.getItem("dmforge.pcs.v1") || "{}").roster || JSON.parse(localStorage.getItem("dmforge.pcs.v1") || "[]")).some?.(x => x.id === "pc-subchange" && x.subclass === "Oathbreaker") }; });
    check(`${size}: changing to the book Oathbreaker gives its features (Aura of Hate) and drops the old copy's`, after.sub === "Oathbreaker" && after.feats.includes("Aura of Hate") && !after.feats.includes("Old Copy Feature") && after.shown, JSON.stringify(after.feats));
    check(`${size}: changing the subclass doesn't heal the character`, after.hpCur === after.hpWas, JSON.stringify([after.hpCur, after.hpWas]));
    // keeping the same subclass just closes the window: no rebuild, HP untouched
    const same = await p.evaluate(() => { const c = pcById("pc-subchange"); c.hpCur = 7; c.feats.push({ l: 1, f: "Marker Kept" }); return true; });
    await btn.first().click(); await p.locator("#lvModal.open").waitFor(); await p.click("#lvModal [data-lvyes]"); await p.waitForTimeout(200);
    const kept = await p.evaluate(() => { const c = pcById("pc-subchange"); return { hp: c.hpCur, marker: c.feats.some(f => f.f === "Marker Kept"), open: document.querySelector("#lvModal").classList.contains("open") }; });
    check(`${size}: keeping the same subclass closes the window without rebuilding`, same && kept.hp === 7 && kept.marker && !kept.open, JSON.stringify(kept));
    check(`${size}: level, scores and name stay the same`, after.lv === before.lv && after.scores === before.scores && after.name === "Buster", JSON.stringify([after.lv, after.scores, after.name]));

    // an imported character (its scores come from the file) keeps them when its subclass changes
    const zook = require("fs").readFileSync(require("path").join(__dirname, "fixtures", "companion-zook.json"), "utf8");
    const imp = await p.evaluate(txt => { const D = compImport(JSON.parse(txt), "2014"); const { c } = importBuild(D); c.id = "pc-zook"; c.hbPending = D.homebrew; PCS.roster.unshift(c); RC.id = c.id; pcPersist(); hbPendSync(); renderRosterTab();
      return { sub: c.subclass, scores: JSON.stringify(Object.keys(c.scores).sort().map(k => [k, c.scores[k]])) }; }, zook);
    await p.locator('#rosterMain [data-subchange="pc-zook"]').first().click(); await p.locator("#lvModal.open").waitFor();
    await p.click('#lvModal [data-lvsub="Hunter"]'); await p.click("#lvModal [data-lvyes]"); await p.waitForTimeout(300);
    const imp2 = await p.evaluate(() => { const c = pcById("pc-zook"); return { sub: c.subclass, scores: JSON.stringify(Object.keys(c.scores).sort().map(k => [k, c.scores[k]])), feats: c.feats.map(f => f.f) }; });
    check(`${size}: an imported character changes subclass (Swarmkeeper [UA] to Hunter) and keeps the file's scores`, imp.sub === "Swarmkeeper [UA]" && imp2.sub === "Hunter" && imp2.scores === imp.scores && imp2.feats.includes("Hunter's Prey") && !imp2.feats.includes("Gathered Swarm"), JSON.stringify([imp, imp2.sub, imp2.scores]));
    check(`${size}: no page errors`, !errs.length, errs.join(" | "));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll subclass change checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
