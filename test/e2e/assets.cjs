// The page's code, styling and built-in data load from fingerprinted files in public/assets/. Run with:  npm run test:assets
// Checks: the files match src/ and data/, each tab can read the data, the monster list is read once and shared,
// a second visit downloads only the page itself, and the app still works with no connection.
// Starts its own static server for public/ that sends the same cache headers as netlify.toml.
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public"), DATA = path.join(__dirname, "..", "..", "data");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".webmanifest": "application/manifest+json" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const hits = {};
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  hits[u.pathname] = (hits[u.pathname] || 0) + 1;
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); return res.end(); }
    const h = { "content-type": TYPES[path.extname(f)] || "application/octet-stream" };
    if (u.pathname.startsWith("/assets/")) h["cache-control"] = "public, max-age=31536000, immutable";
    if (u.pathname === "/sw.js") h["cache-control"] = "no-cache";
    res.writeHead(200, h); res.end(b);
  });
});

(async () => {
  // the files are up to date with data/*.json
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const files = [...html.matchAll(/(?:src|href)="(\/assets\/[\w.]+)"/g)].map(m => m[1]);
  check("the page loads five fingerprinted files (data, code, styling)", files.length === 5, files.join(", "));
  const extraMonsters = html.match(/name="forge-extra-monsters" content="([^"]+)"/)?.[1];
  check("the extra monster catalog is lazy", !!extraMonsters && !files.includes(extraMonsters) && !sw.includes(extraMonsters));
  const { legacySpells } = JSON.parse(fs.readFileSync(path.join(DATA, "spell-grants.json"), "utf8"));
  for (const [name, key] of [["spells", "spellData"], ["monsters", "monsterData"], ["items", "itemData"]]) {
    const f = files.find(x => x.startsWith(`/assets/${name}.`)), js = f && fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), "utf8") : "";
    const w = {}; try { new Function("window", js)(w); } catch { }
    const expected = JSON.parse(fs.readFileSync(path.join(DATA, name + ".json"), "utf8"));
    if (name === "spells") expected["2014"].push(...legacySpells);
    const same = w.DMDATA && JSON.stringify(JSON.parse(w.DMDATA[key])) === JSON.stringify(expected);
    check(`${name}: public${f} matches data/${name}.json`, !!same);
    check(`${name}: the file name's fingerprint matches its contents`, !!f && f.includes("." + crypto.createHash("sha256").update(js).digest("hex").slice(0, 10) + "."));
    check(`${name}: the service worker keeps it for offline use`, !!f && sw.includes(`"${f}"`));
  }
  const SRC = path.join(__dirname, "..", "..", "src");
  const appJs = files.find(x => /^\/assets\/app\.\w+\.js$/.test(x)), appCss = files.find(x => /^\/assets\/app\.\w+\.css$/.test(x));
  const js = appJs ? fs.readFileSync(path.join(ROOT, appJs), "utf8") : "", css = appCss ? fs.readFileSync(path.join(ROOT, appCss), "utf8") : "";
  const srcFiles = fs.readdirSync(path.join(SRC, "app")).filter(f => f.endsWith(".js")).sort();
  let pos = 0, inOrder = true;
  for (const f of srcFiles) { const i = js.indexOf(fs.readFileSync(path.join(SRC, "app", f), "utf8"), pos); if (i < 0) inOrder = false; else pos = i; }
  check(`app code: has every src/app file, in order (${srcFiles.length} files)`, !!js && inOrder);
  // background pictures: src/backdrop/corridor-<name>.webp -> /assets/backdrop-<name>.<fingerprint>.webp, named in the styling
  const pics = fs.readdirSync(path.join(SRC, "backdrop")).filter(f => f.endsWith(".webp"));
  const built = fs.readdirSync(path.join(ROOT, "assets")).filter(f => /^backdrop-[\w-]+\.\w+\.webp$/.test(f));
  check("there is a wide background picture", pics.includes("corridor-wide.webp"), pics.join(", "));
  let srcCss = fs.readFileSync(path.join(SRC, "app.css"), "utf8");
  for (const f of pics) {
    const name = "backdrop-" + f.replace(/^corridor-/, "").replace(/\.webp$/, ""), b = built.find(x => x.startsWith(name + "."));
    const bytes = fs.readFileSync(path.join(SRC, "backdrop", f)), out = b ? fs.readFileSync(path.join(ROOT, "assets", b)) : Buffer.alloc(0);
    check(`${name}: built from src/backdrop/${f}, fingerprint matches its bytes`, !!b && out.equals(bytes) && b.includes("." + crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 10) + "."), b || "missing");
    if (b) srcCss = srcCss.split(`/assets/${name}.webp`).join(`/assets/${b}`);
  }
  check("app styling: matches src/app.css, with the pictures' built names", !!css && css === srcCss);
  check("app styling: every picture it names is fingerprinted", !!css && !/\/assets\/backdrop-[\w-]+\.webp/.test(css));
  check("the pictures aren't in the install list (phones only fetch the one they show)", !/\.webp/.test(sw));
  const picUrl = built.find(x => x.startsWith("backdrop-wide.")) ? "/assets/" + built.find(x => x.startsWith("backdrop-wide.")) : "";
  for (const f of [appJs, appCss]) {
    const t = f ? fs.readFileSync(path.join(ROOT, f), "utf8") : "";
    check(`${f}: fingerprint matches its contents and the service worker keeps it`, !!f && f.includes("." + crypto.createHash("sha256").update(t).digest("hex").slice(0, 10) + ".") && sw.includes(`"${f}"`));
  }

  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL); await p.waitForFunction(() => typeof generateCharacter === "function");

  // every reader works and the monster list is shared
  const r = await p.evaluate(() => {
    const raw = !!window.DMDATA.spellData && !!window.DMDATA.monsterData && !!window.DMDATA.itemData;
    spLoad(); bsLoad(); itLoad();
    const rand = randMonsters(), idx = mwMonsterIndex([]);
    return {
      raw, spells: SP.data["2014"].length + SP.data["2024"].length, monsters: BS.data["2014"].length + BS.data["2024"].length,
      items: IT.data["2014"].length + IT.data["2024"].length, rand: rand.length, idx: idx.length,
      shared: rand[0] === BS.data["2014"].find(m => m.n === rand[0].n), dropped: !window.DMDATA.spellData && !window.DMDATA.monsterData && !window.DMDATA.itemData,
    };
  });
  const handbook = await p.evaluate(() => ({
    spells: SP.data["2014"].filter(x => x.src === "phb-2014").length,
    items: IT.data["2014"].filter(x => x.src === "dmg-2014").length,
    revised: [...SP.data["2024"], ...IT.data["2024"]].some(x => /^(phb|dmg)-2014$/.test(x.src || "")),
    death: subclassList("2014", "Cleric").some(([n]) => n === "Death Domain") &&
      progressionRows("2014", "subclass", "Cleric", "Death Domain")[1].some(([n]) => n.includes("Touch of Death")),
    oath: subclassList("2014", "Paladin").some(([n]) => n === "Oathbreaker") &&
      !subclassList("2024", "Paladin").some(([n]) => n === "Oathbreaker"),
    credit: bookLine(IT.data["2014"].find(x => x.n === "Sending Stones"))
  }));
  check("2014 handbook spells and items stay in their edition", handbook.spells === 28 + legacySpells.length && handbook.items === 20 && !handbook.revised, JSON.stringify(handbook));
  check("2014 DMG subclasses show in the builder and progression", handbook.death && handbook.oath);
  check("handbook summaries show printed page attribution", /p. 199.*Rules summary/.test(handbook.credit));
  check("the styling is applied (served as text/css)", await p.evaluate(() => [...document.styleSheets].some(s => /\/assets\/app\.\w+\.css$/.test(s.href || "") && s.cssRules.length > 100) && getComputedStyle(document.body).fontFamily.includes("Crimson")));
  check("the page is in standards mode", await p.evaluate(() => document.compatMode === "CSS1Compat"));
  check("the data is there before the app starts", r.raw);
  check("spells, monsters and items all load", r.spells > 600 && r.monsters > 600 && r.items > 600, JSON.stringify(r));
  check("random encounters and imports use the same monster list as the Monster Manual", r.shared && r.rand > 100 && r.idx > 300, JSON.stringify(r));
  check("the text copies are dropped once read", r.dropped);
  await p.goto(URL + "#spells"); await p.waitForFunction(() => document.querySelectorAll("#view-spells .sp-row, #view-spells [data-sp], #spList > *").length > 5, null, { timeout: 10000 }).then(() => check("Spells tab lists spells", true), () => check("Spells tab lists spells", false));

  // a second visit doesn't download the data again
  await p.evaluate(() => navigator.serviceWorker.ready);
  check("the first visit does not download the extra monster catalog", !hits[extraMonsters]);
  await p.reload(); await p.waitForFunction(() => !!navigator.serviceWorker.controller);
  for (const k of Object.keys(hits)) delete hits[k];
  await p.reload(); await p.waitForFunction(() => typeof generateCharacter === "function");
  check("a second visit doesn't download the code, styling or data", files.every(f => !hits[f]), JSON.stringify(hits));
  check("…but does fetch the page fresh, so updates show", hits["/"] >= 1, JSON.stringify(hits));

  check("the extra catalog has stayed off the startup path", !hits[extraMonsters]);
  await p.goto(URL + "#compendium");
  const results = p.locator("#compendiumResults");
  const query = p.locator("#compendiumQuery");
  const count = p.locator("#compendiumCount");
  await results.getByRole("button").first().waitFor();
  const firstPage = await results.getByRole("button").allTextContents();
  check("the Compendium lists its first page before typing", firstPage.length === 60
    && await query.inputValue() === "" && /^Showing 1–60 of /.test(await count.textContent()));
  await p.getByRole("button", { name: "Next page" }).click();
  check("Compendium can browse beyond the first page", /^Showing 61–120 of /.test(await count.textContent())
    && (await results.getByRole("button").allTextContents())[0] !== firstPage[0]);
  await p.getByRole("button", { name: "Previous page" }).click();
  check("returning to the first page restores its entries", (await results.getByRole("button").allTextContents())[0] === firstPage[0]);
  await p.locator("#compendiumType").selectOption("Spell");
  await results.getByRole("button").first().waitFor();
  check("type filters work before typing", (await results.locator("small").allTextContents()).every(label => label.startsWith("Spell")));
  await p.getByRole("button", { name: "Next page" }).click();
  await query.fill("fireb");
  await results.getByRole("button", { name: /Fireball.*Spell/ }).first().waitFor();
  check("a partial name searches all pages and resets pagination", /^Showing 1–/.test(await count.textContent()));
  await p.locator("#compendiumType").selectOption("");
  await query.fill("Fireball");
  await results.getByRole("button", { name: /Fireball.*Spell/ }).first().click();
  check("compendium opens spell details", await p.locator("#characterReference").getByText("Casting time").isVisible());
  const monsterIndex = html.match(/name="forge-monster-index" content="([^"]+)"/)?.[1];
  const legacyReferences = html.match(/name="forge-book-references-2014" content="([^"]+)"/)?.[1];
  check("an all-types spell search uses the small monster index", !!hits[monsterIndex] && !hits[extraMonsters]);
  check("a revised-edition search does not fetch 2014 references", !hits[legacyReferences]);
  await p.locator("#characterReference").getByRole("button", { name: "Close" }).click();
  await p.locator("#compendiumEdition").selectOption("2014");
  await results.getByRole("button", { name: /Fireball.*2014/ }).first().waitFor();
  check("compendium respects the edition filter", !/2024/.test(await results.innerText()) && !!hits[legacyReferences]);
  await query.clear();
  await results.getByRole("button").first().waitFor();
  check("clearing the search restores the selected edition's catalog", /^Showing 1–60 of /.test(await count.textContent())
    && (await results.locator("small").allTextContents()).every(label => label.includes("2014")));

  await query.fill("abi dalz");
  await results.getByRole("button", { name: /Abi-Dalzim/ }).first().click();
  check("punctuation-insensitive search opens the book reference", await p.locator("#characterReference").getByText(/Reference only/).isVisible());
  await p.locator("#characterReference").getByRole("button", { name: "Close" }).click();
  /* reference summaries (2026-11-26): a feat with no details shows its short summary from data/reference-summaries.json */
  await query.fill("squat nimbleness");
  await results.getByRole("button", { name: /Squat Nimbleness.*Book reference/ }).first().click();
  const featRef = p.locator("#characterReference");
  check("a book reference feat shows its summary", await featRef.getByText(/A short summary/).isVisible()
    && /Needs: dwarf or a Small species/.test(await featRef.innerText()) && /p\. 75/.test(await featRef.innerText()));
  await featRef.getByRole("button", { name: "Close" }).click();
  /* an "Other rules" entry that two books share takes the summary keyed to its own book */
  await query.fill("enhanced defense");
  await results.getByRole("button", { name: /Enhanced Defense.*Book reference/ }).first().click();
  check("an Other rules reference shows its summary", /Artificer infusion for armor or a shield/.test(await featRef.innerText()));
  await featRef.getByRole("button", { name: "Close" }).click();
  await query.fill("silvered weapon");
  await results.getByRole("button", { name: /Silvered Weapon.*Book reference/ }).first().click();
  check("everyday book items say Rarity none, not unknown", /Rarity · none/.test(await featRef.innerText()));
  await featRef.getByRole("button", { name: "Close" }).click();
  await p.locator("#compendiumQuery").fill("Test campaign spell");
  await p.evaluate(() => hbSet([{ id: "compendium-test", kind: "spell", name: "Test campaign spell", desc: "A campaign spell.", ed: "2014" }]));
  await results.getByRole("button", { name: /Test campaign spell/ }).waitFor();
  check("compendium updates when campaign homebrew arrives", /Homebrew/.test(await results.innerText()));
  await p.evaluate(() => hbSet([]));
  await p.waitForFunction(() => $("#compendiumCount").textContent === "0 matches");
  check("compendium drops removed campaign homebrew", !/Test campaign spell/.test(await results.innerText()));
  await p.locator("#compendiumType").selectOption("Monster");
  await query.fill("tome bea 3");
  const monster = results.getByRole("button", { name: /Tome of Beasts 3/ }).first();
  await monster.waitFor();
  check("search lists extra monsters before loading their stat blocks", !hits[extraMonsters]);
  await monster.click();
  await p.locator("#characterReference[open]").waitFor();
  check("opening an extra monster loads the full catalog once", hits[extraMonsters] === 1);
  await p.locator("#characterReference").getByRole("button", { name: "Close" }).click();
  await p.waitForFunction(url => caches.match(url).then(Boolean), extraMonsters);

  if (picUrl) await p.evaluate(u => fetch(u).then(r => r.blob()), picUrl);
  await p.waitForTimeout(300);
  // with no connection the app still has its data
  await ctx.setOffline(true);
  await p.goto(URL + "#spells").catch(() => {});
  const off = await p.waitForFunction(() => typeof spLoad === "function", null, { timeout: 10000 }).then(() => p.evaluate(() => { spLoad(); bsLoad(); itLoad(); return SP.data["2024"].length > 100 && BS.data["2024"].length > 100 && IT.data["2024"].length > 100; })).catch(e => String(e));
  check("offline: spells, monsters and items still load", off === true, String(off));
  await p.reload().catch(() => {});
  const cachedExtra = await p.evaluate(() => dmLoadExtraMonsters());
  check("offline: the previously opened extra catalog still loads", cachedExtra === true);
  const pic = picUrl ? await p.evaluate(u => fetch(u).then(r => r.ok && r.headers.get("content-type") === "image/webp").catch(e => String(e)), picUrl) : "no picture";
  check("offline: the background picture comes from the saved copy", pic === true, String(pic));
  await ctx.setOffline(false);

  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll data file checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
