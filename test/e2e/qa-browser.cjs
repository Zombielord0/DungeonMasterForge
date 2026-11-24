// Fixes from the browser QA pass of 2026-11-23. Run with:  npm run test:qabrowser
// Shop wording, lone monsters in random encounters, the Compendium's icon, phone layout of the Forge form
// and the bottom bar, and the Characters tab coming back to the open character after a refresh.
// (A new DM's campaign appearing in the Tracker is checked in setup-screen.cjs, which needs sign-in.)
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
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
  const browser = await chromium.launch(), errs = [];
  const mk = async opts => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block", ...opts });
    await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message)); return p;
  };
  try {
    const p = await mk();
    await p.goto(URL); await p.waitForFunction(() => typeof shopMake === "function" && typeof randomEncounter === "function");

    // 1. shop wording: "…run by X, who is <manner>." reads right for every manner
    const shop = await p.evaluate(() => SHOP_MOODS.map((m, i) => `run by Brom, who is ${shopMake({ type: "general", size: "town", level: 3, seed: "Q" + i, ed: "2024", moodIx: i }).mood}.`));
    check("every shopkeeper's manner reads right after 'who is'", shop.every(t => !/who is (haggles|is |has )/.test(t)), shop.join(" / "));

    // 2. a lone monster never gets a group's hook
    const lone = await p.evaluate(() => {
      const bad = [], seen = { lone: 0, group: 0 };
      for (const env of RAND_ENVS.map(e => e[0])) for (let lv = 1; lv <= 8; lv++) for (let k = 0; k < 6; k++) {
        const e = randomEncounter(makeRng("qa", env, lv, k), env, lv, 1 + (k % 4), ["easy", "medium", "hard"][k % 3]); if (!e) continue;
        if (e.groups[0].count === 1) { seen.lone++; if (/themselves|with one keeping|their lair|they lost/.test(e.hook)) bad.push(e.hook); } else seen.group++;
      }
      return { bad, seen, same: RAND_HOOKS.length === RAND_HOOKS_ONE.length };
    });
    check("lone monsters get hooks for one creature", lone.seen.lone > 20 && !lone.bad.length, JSON.stringify(lone.seen) + " " + lone.bad.slice(0, 3).join(" / "));
    check("groups still get the group hooks, one for one", lone.seen.group > 20 && lone.same);

    // 3. every header tab has an icon (the Compendium had none)
    await p.goto(URL + "#compendium"); await p.waitForTimeout(300);
    const noIcon = await p.evaluate(() => [...document.querySelectorAll("header nav a[data-view]")].filter(a => !getComputedStyle(a).getPropertyValue("--ic").trim()).map(a => a.dataset.view));
    check("every header tab has its own icon", !noIcon.length, noIcon.join());
    // the app icons and the header emblem (new picture, 2026-11-24): each loads at its stated size
    const pics = await p.evaluate(async () => {
      const load = src => new Promise(res => { const i = new Image(); i.onload = () => res([src, i.naturalWidth, i.naturalHeight]); i.onerror = () => res([src, 0, 0]); i.src = src; });
      const man = await (await fetch("/manifest.webmanifest")).json();
      const want = [...man.icons.map(x => [x.src, +x.sizes.split("x")[0]]), ["/icons/apple-touch-icon.png", 180], ["/icons/emblem.webp", 144]];
      const got = await Promise.all(want.map(([src]) => load(src)));
      return { bad: got.filter(([src, w, h], k) => w !== want[k][1] || h !== w).map(x => x.join(" ")), emblem: (document.querySelector("img.emblem") || {}).naturalWidth };
    });
    const emptyPic = await p.evaluate(() => { const h = document.querySelector(".empty h2"); return h ? getComputedStyle(h, "::before").backgroundImage : ""; });
    check("empty pages show the emblem above their heading", /\/icons\/emblem\.webp/.test(emptyPic), emptyPic.slice(0, 80));
    check("the app icons and header emblem load at their sizes", !pics.bad.length && pics.emblem === 144, JSON.stringify(pics));

    // 4. the Characters tab comes back to the character that was open
    await p.goto(URL + "#roster"); await p.waitForFunction(() => typeof keepPC === "function");
    const ids = await p.evaluate(() => { for (const s of ["QA1", "QA2"]) { currentPC = pcEnsure(generateCharacter({ seed: s, name: "Hero " + s, ed: "2024", level: 3 })); keepPC(); } return PCS.roster.map(c => c.id); });
    const second = ids.find(id => id !== ids[0]);
    await p.click(`#rosterList [data-rc="${second}"]`); await p.waitForTimeout(800);
    await p.reload(); await p.waitForSelector("#rosterList .camp-item.on");
    check("after a refresh the same character is open", await p.getAttribute("#rosterList .camp-item.on", "data-rc") === second);

    // QA pass 2 (2026-11-24). Fresh page: the Wild Shape list grows by itself once the extra books load
    await p.reload(); await p.waitForFunction(() => typeof wildBeasts === "function");
    const ws = await p.evaluate(async () => {
      const d = pcEnsure(generateCharacter({ seed: "QAWS", name: "Fern", cls: "Druid", level: 8, ed: "2014" }));
      const before = wildBeasts(d).length;
      await new Promise(r => { const t = setInterval(() => { if (extraMonstersReady) { clearInterval(t); r(); } }, 50); setTimeout(() => { clearInterval(t); r(); }, 15000); });
      const after = wildBeasts(d).length;
      const bear = wildBeasts(d).find(m => m.n === "Bear, Black" && m.src === "bfrd");
      return { before, after, bear: bear ? beastForm(bear.id).attacks.map(a => a.name + " " + a.hit + " " + a.die) : null,
        noAttacks: wildBeasts(d).filter(m => m.src && (m.actions || []).some(a => /Weapon Attack/.test(a[1])) && !beastForm(m.id).attacks.length).map(m => m.n) };
    });
    check("QA2: the Wild Shape list adds the extra books' beasts without opening the Monster Manual", ws.after > ws.before && ws.before > 0, JSON.stringify([ws.before, ws.after]));
    check("QA2: Black Flag beasts have their attacks in Wild Shape", JSON.stringify(ws.bear) === JSON.stringify(["Bite 4 1d6", "Claws 4 1d4"]) && !ws.noAttacks.length, JSON.stringify(ws));
    // the extra books' monsters: attacks for all but the Boomer (it has none in the book), and damage lines that only name damage
    const mon = await p.evaluate(() => {
      const L = dmData("monsterData")["2014"].filter(m => m.src), by = n => L.find(m => m.n === n) || {};
      const CONDS = /^(blinded|charmed|deafened|exhaustion|frightened|grappled|incapacitated|invisible|paralyzed|petrified|poisoned|prone|restrained|stunned|unconscious)$/i;
      const bad = L.filter(m => ["res", "imm", "vul"].some(k => String(m[k] || "").split(";").some(seg => !/\(conditions?\)/.test(seg) && seg.split(",").some(t => CONDS.test(t.trim())))) || /Condition Immunities/.test(m.imm || "") || /,\S/.test(m.lang || ""));
      const hag = by("Ambush Hag");
      return { noActs: L.filter(m => !(m.actions || []).length).map(m => m.n), akanka: (by("Akanka").actions || []).map(a => a[0]), bad: bad.map(m => m.n).slice(0, 5),
        hag: [hag.res, hag.imm, hag.ci, hag.lang], ape: by("Ape, Giant").res };
    });
    check("QA2: Tome of Beasts 3 monsters have their Actions", mon.noActs.join() === "Boomer" && mon.akanka.includes("Bite"), JSON.stringify(mon.noActs.slice(0, 5)) + " " + mon.akanka);
    check("QA2: damage lines name only damage; conditions and traits are labelled", !mon.bad.length && JSON.stringify(mon.hag) === JSON.stringify(["see Fey Resilience", "poison", "poisoned", "Common, Sylvan"]) && mon.ape === "stunned (condition)", JSON.stringify(mon));
    // Unarmored Defense from a second class
    const ac = await p.evaluate(() => [["Fighter", "Barbarian", "con"], ["Ranger", "Monk", "wis"], ["Monk", "Barbarian", "con"]].map(([a, b, ab]) => {
      const c = pcEnsure(generateCharacter({ seed: "QAAC", name: "Ace", cls: a, level: 3, ed: "2014", subclass: "none", multi: [{ cls: b, lv: 3 }] }));
      pcInvUpgrade(c); c.inv.forEach(i => { if (i.eq && eqArmorOf(i, "2014")) i.eq = false; }); pcRecompute(c);
      const want = Math.max(10 + c.mods.dex + c.mods[ab], a === "Monk" ? 10 + c.mods.dex + c.mods.wis : 0);
      return [a + "/" + b, pcAC(c).ac, want];
    }));
    check("QA2: Unarmored Defense counts from a second class (Barbarian or Monk)", ac.every(([, got, want]) => got === want), JSON.stringify(ac));
    await p.context().close();

    // 5. phones: the Forge form stays inside its card, and the bottom bar keeps whole words
    for (const width of [320, 390]) {
      const ph = await mk({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
      await ph.goto(URL + "#roster"); await ph.waitForFunction(() => typeof mobileNavSync === "function");
      await ph.evaluate(() => { const f = document.querySelector("#forgeBox"); if (f && !f.open) f.open = true; });
      await ph.waitForTimeout(200);
      const form = await ph.evaluate(() => {
        const edge = document.querySelector("#pcSide").getBoundingClientRect().right;
        return { out: ["#pcRace", "#pcClass", "#pcBg", "[data-progression=class]", "[data-progression=background]"].filter(s => document.querySelector(s).getBoundingClientRect().right > edge + 0.5), wide: document.documentElement.scrollWidth > innerWidth };
      });
      check(`${width} px: the Forge form fits its card`, !form.out.length && !form.wide, JSON.stringify(form));
      const nav = await ph.evaluate(() => {
        document.body.classList.add("portal-dm"); // the DM's shortcuts include Compendium, the longest word
        mobileNavSync("roster");
        return [...document.querySelectorAll("#mobileNav a, #mobileNav .btn")].map(a => { const r = document.createRange(); r.selectNodeContents(a); return { t: a.textContent.trim(), lines: new Set([...r.getClientRects()].map(x => Math.round(x.top))).size, over: a.scrollWidth > a.clientWidth }; });
      });
      check(`${width} px: bottom bar words aren't split or cut off`, nav.some(n => n.t === "Compendium") && nav.every(n => n.lines === 1 && !n.over), JSON.stringify(nav));
      await ph.context().close();
    }
    check("no page errors", !errs.length, errs.join(" | "));
  } catch (e) { console.error(e); fails++; }
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll QA fix checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
