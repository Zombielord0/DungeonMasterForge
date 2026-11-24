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

    // QA pass 3 (2026-11-24)
    // QA-1: rolled enemy initiative adds the monster's own bonus (Air Elemental, Dex 20: +5)
    await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof newEncounter === "function");
    await p.click("#newCamp"); await p.waitForTimeout(200);
    const init = await p.evaluate(() => {
      const c = curCamp(); c.encounters = c.encounters || [];
      c.encounters.push(newEncounter(null, "QA fight", 5, [{ name: "Air Elemental", stat: "Air Elemental", cr: 5, count: 1, boss: false }]));
      Store.save(c); subTab = "encounters"; renderTracker(); window.__rnd = Math.random; Math.random = () => 0; return c.encounters[c.encounters.length - 1].id;
    });
    await p.click(`[data-ea="roll"][data-eid="${init}"]`); await p.waitForTimeout(200);
    const rolled = await p.evaluate(id => { Math.random = window.__rnd; return curCamp().encounters.find(e => e.id === id).enemies.map(m => +m.init); }, init);
    check("QA3: rolled enemy initiative adds the monster's Dexterity (Air Elemental 1 + 5)", rolled.join() === "6", rolled.join());
    // QA-2, QA-3: companions for a multiclass Druid or Ranger, and Circle of the Moon limits
    const comp = await p.evaluate(() => {
      const fd = pcEnsure(generateCharacter({ seed: "QAC1", name: "Mix", cls: "Fighter", level: 5, ed: "2014", multi: [{ cls: "Druid", lv: 4 }, { cls: "Ranger", lv: 3 }] }));
      const moon = pcEnsure(generateCharacter({ seed: "QAC2", name: "Moon", cls: "Druid", level: 2, ed: "2014", subclass: "Circle of the Moon" }));
      const r = compRule(moon, "wild", "2014");
      return { kinds: compKinds(fd), moonText: r.text, moonCR1: r.test({ type: "beast", cr: 1, speed: "40 ft." }), moonLimit: wildShapeLimit(moon).cr };
    });
    check("QA3: a multiclass Druid and Ranger get Companions & Wild Shape", comp.kinds.includes("wild") && comp.kinds.includes("beast"), JSON.stringify(comp.kinds));
    check("QA3: Circle of the Moon's beast limit matches the Wild Shape picker (CR 1 at level 2)", comp.moonCR1 && comp.moonLimit === 1 && /CR 1 or lower/.test(comp.moonText), comp.moonText);
    // QA-4: the Feats tab judges general feats by the character's total level
    await p.evaluate(() => { const c = pcEnsure(generateCharacter({ seed: "QAF", name: "Split", cls: "Fighter", level: 2, ed: "2024", multi: [{ cls: "Wizard", lv: 6 }] })); PCS.roster.push(c); pcPersist(); FT.target = c.id; FT.ed = "2024"; FT.q = "Ability Score Improvement"; FT.grp = ""; });
    await p.goto(URL + "#feats"); await p.waitForSelector("#ftList .ft-card");
    const feat = await p.evaluate(() => ({ list: document.querySelector("#ftList").innerText, picker: (document.querySelector("#ftTarget option:checked") || {}).textContent || "" }));
    check("QA3: a level 8 multiclass character can take a general feat on the Feats tab", !/Requires level 4/.test(feat.list) && /Lv 8/.test(feat.picker), feat.picker + " | " + feat.list.slice(0, 160).replace(/\s+/g, " "));
    // QA-5: the monster builder ignores nonsense hit points
    const built = await p.evaluate(() => {
      const f = { ...mbBlank(), name: "Bad Numbers", hp: "-5", hdN: "5", hdD: "8" };
      f.scores = [10, 10, 14, 10, 10, 10]; const m = mbCompile(f, "qa");
      return [m.hp, m.hd];
    }).catch(e => ["error", String(e).slice(0, 80)]);
    check("QA3: the monster builder uses the average when hit points are 0 or less", built[0] === 32 && built[1] === "5d8+10", JSON.stringify(built));
    // QA-6: book-reference beasts have their attacks
    const refs = await p.evaluate(() => { bsLoad(); return ["Pandarian Dragon Turtle", "Swarm of Infesting Insects"].map(n => { const m = Object.values(BS.data).flat().find(x => x.n === n); return m ? beastForm(m.id).attacks.map(a => `${a.name} +${a.hit} ${a.die}${a.mod ? "+" + a.mod : ""} ${a.type}`).join() : "missing"; }); });
    check("QA3: book-reference beasts read their attacks", refs[0] === "Bite +5 1d8+3 piercing" && refs[1] === "Infestation +4 4d4+2 poison", JSON.stringify(refs));
    // shop prices under 1 gp show exact silver and copper
    const gp = await p.evaluate(() => [fmtGp(0.85), fmtGp(0.5), fmtGp(0.05), fmtGp(2)]);
    check("QA3: prices under 1 gp show exact silver and copper", gp.join("|") === "8 sp 5 cp|5 sp|5 cp|2 gp", gp.join("|"));

    // Ideas 4 and 5 (2026-11-24). Map tokens with the same name are numbered
    await p.goto(URL + "#map"); await p.waitForFunction(() => typeof renderMap === "function");
    await p.evaluate(() => { $("#mapSeed").value = "TOK1"; renderMap(); HOST.tokens = []; });
    await p.evaluate(() => { for (const n of ["Goblin", "Goblin", "Goblin", "Orc"]) tokAdd(n, "foe"); }); /* what the Add button does; its box only works with the TV on */
    const tokNames = await p.evaluate(() => HOST.tokens.map(t => t.name).join());
    check("IDEA: map tokens with the same name are numbered", tokNames === "Goblin 1,Goblin 2,Goblin 3,Orc", tokNames);
    // group initiative: one roll per kind of monster; re-rolling mid-fight asks first
    await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof newEncounter === "function");
    const gid = await p.evaluate(() => {
      const c = curCamp(); c.encounters = c.encounters || [];
      c.encounters.push(newEncounter(null, "Group fight", 3, [{ name: "Goblin", stat: "Goblin", cr: 0.25, count: 3, boss: false }, { name: "Wolf", stat: "Wolf", cr: 0.25, count: 2, boss: false }]));
      Store.save(c); subTab = "encounters"; renderTracker(); return c.encounters[c.encounters.length - 1].id;
    });
    await p.check(`[data-ef="groupInit"][data-eid="${gid}"]`);
    await p.click(`[data-ea="roll"][data-eid="${gid}"]`); await p.waitForTimeout(200);
    const grp = await p.evaluate(id => { const e = curCamp().encounters.find(x => x.id === id); const by = {}; e.enemies.forEach(m => (by[m.stat] = by[m.stat] || new Set()).add(m.init)); return { group: e.groupInit, sizes: Object.values(by).map(x => x.size), round: e.round }; }, gid);
    check("IDEA: Group by monster gives each kind of monster one initiative", grp.group === true && grp.sizes.every(n => n === 1) && grp.sizes.length === 2, JSON.stringify(grp));
    await p.evaluate(id => { const c = curCamp(), e = c.encounters.find(x => x.id === id); e.round = 3; Store.save(c); renderTracker(); }, gid);
    await p.click(`[data-ea="roll"][data-eid="${gid}"]`); await p.waitForSelector("#modal.open");
    await p.click("#modalNo"); await p.waitForTimeout(150);
    const kept = await p.evaluate(id => curCamp().encounters.find(x => x.id === id).round, gid);
    await p.click(`[data-ea="roll"][data-eid="${gid}"]`); await p.waitForSelector("#modal.open"); await p.click("#modalYes"); await p.waitForTimeout(200);
    const again = await p.evaluate(id => curCamp().encounters.find(x => x.id === id).round, gid);
    check("IDEA: re-rolling mid-fight asks first; No keeps the round, Re-roll starts at round 1", kept === 3 && again === 1, JSON.stringify([kept, again]));
    const boss = await p.evaluate(id => { const c = curCamp(), e = c.encounters.find(x => x.id === id); e.enemies[0].boss = true; e.enemies[0].name = "Grak"; Store.save(c); renderTracker(); return e.enemies[0].id; }, gid);
    await p.evaluate(id => { const c = curCamp(), e = c.encounters.find(x => x.id === id); e.round = 1; Store.save(c); renderTracker(); window.__rnd2 = Math.random; let i = 0; Math.random = () => [0.05, 0.95][i++ % 2]; }, gid);
    await p.click(`[data-ea="roll"][data-eid="${gid}"]`); await p.waitForTimeout(150);
    const bossAlone = await p.evaluate(([id, bid]) => { const e = curCamp().encounters.find(x => x.id === id); Math.random = window.__rnd2; const gob = e.enemies.filter(m => m.stat === "Goblin" && !m.boss).map(m => m.init); return { same: new Set(gob).size === 1, n: gob.length, gob: gob[0], boss: e.enemies.find(m => m.id === bid).init }; }, [gid, boss]);
    check("IDEA: a boss rolls its own initiative in Group by monster", bossAlone.same && bossAlone.n === 2 && bossAlone.boss !== bossAlone.gob, JSON.stringify(bossAlone));
    // a numbered token still shows its monster's Bloodied/Down state on the TV
    const tokState = await p.evaluate(() => {
      const c = curCamp(), e = newEncounter(null, "Lone", 1, [{ name: "Goblin", stat: "Goblin", cr: 0.25, count: 1, boss: false }]); e.enemies[0].hp = 0; c.encounters.push(e); Store.save(c);
      HOST.enc = { cid: c.id, eid: e.id }; HOST.tokens = []; tokAdd("Goblin", "foe"); tokAdd("Goblin", "foe");
      const v = tokenView().map(t => t.name + ":" + t.state); HOST.enc = null; HOST.tokens = []; return v;
    });
    check("IDEA: numbered tokens keep their monster's Bloodied/Down state on the TV", tokState.join() === "Goblin 1:Down,Goblin 2:Down", tokState.join());

    // UI review (2026-11-24), laptop: Saved / Backup / bell share the title's row; Skip to content; Next turn leads a fight
    await p.goto(URL + "#generate"); await p.reload(); await p.waitForFunction(() => typeof route === "function"); await p.waitForTimeout(800);
    const hdr = await p.evaluate(() => { const mid = r => (r.top + r.bottom) / 2, b = document.querySelector("#storeBadge").getBoundingClientRect(), t = document.querySelector(".brand").getBoundingClientRect(), n = document.querySelector("header nav").getBoundingClientRect(); return { level: Math.round(Math.abs(mid(b) - mid(t))), above: b.bottom <= n.top + 2 }; });
    check("UI: on laptops, Saved / Backup / the bell sit beside the title, above the tabs", hdr.level < 30 && hdr.above, JSON.stringify(hdr));
    await p.keyboard.press("Tab"); /* the first Tab on a fresh page */
    const skip = await p.evaluate(() => document.activeElement && document.activeElement.id);
    await p.keyboard.press("Enter");
    const skipped = await p.evaluate(() => document.activeElement && document.activeElement.matches("section.view.active"));
    check("UI: the first Tab reaches Skip to content, and it jumps to the page", skip === "skipLink" && skipped, JSON.stringify([skip, skipped]));
    await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof newEncounter === "function");
    const ctl = await p.evaluate(() => { const c = curCamp(); const e = newEncounter(null, "Ctl", 3, [{ name: "Goblin", stat: "Goblin", cr: 0.25, count: 2, boss: false }]); e.enemies.forEach((m, i) => m.init = 10 - i); e.status = "Active"; e.round = 1; e.turn = e.enemies[0].id; c.encounters.push(e); Store.save(c); subTab = "encounters"; renderTracker();
      const card = document.getElementById("enc-" + e.id); return { next: card.querySelector('[data-ea="next"]').classList.contains("primary"), roll: card.querySelector('[data-ea="roll"]').classList.contains("primary"), more: !!card.querySelector('.enc-more [data-ea="saveTemplate"]'), bar: document.querySelector("#fightBar").offsetHeight }; });
    check("UI: during a fight Next turn is the gold button; setup buttons fold under More; no fight bar on laptops", ctl.next && !ctl.roll && ctl.more && ctl.bar === 0, JSON.stringify(ctl));
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
      if (width === 390) {
        // UI review, phones: the sheet comes first; buttons are 44 px; the campaign comes before the list; the fight bar
        await ph.evaluate(() => { const c = pcEnsure(generateCharacter({ seed: "UIP", name: "Pip", cls: "Fighter", level: 2, ed: "2024" })); PCS.roster.push(c); pcPersist(); });
        await ph.goto(URL + "#tracker"); await ph.waitForTimeout(150); await ph.goto(URL + "#roster"); await ph.waitForSelector("#rosterMain .card", { state: "attached" }); await ph.waitForTimeout(200);
        const sheet = await ph.evaluate(() => ({ listOpen: document.querySelector("#rosterBox").open, small: [...document.querySelectorAll("#rosterMain .btn.sm")].filter(b => b.offsetHeight && b.offsetHeight < 44).length }));
        check("UI phone: with a character open the list folds, and sheet buttons are at least 44 px tall", !sheet.listOpen && !sheet.small, JSON.stringify(sheet));
        await ph.goto(URL + "#tracker"); await ph.waitForFunction(() => typeof newEncounter === "function");
        if (!(await ph.evaluate(() => !!curCamp()))) await ph.click("#newCamp");
        const fb = await ph.evaluate(() => { const c = curCamp(); const e = newEncounter(null, "Bar fight", 3, [{ name: "Goblin", stat: "Goblin", cr: 0.25, count: 2, boss: false }]); e.enemies.forEach((m, i) => m.init = 12 - i); e.status = "Active"; e.round = 2; e.turn = e.enemies[0].id; c.encounters = [e]; Store.save(c); subTab = "overview"; renderTracker();
          const bar = document.querySelector("#fightBar"), main = document.querySelector("#campMain").getBoundingClientRect(), side = document.querySelector("#view-tracker .side").getBoundingClientRect();
          return { id: e.id, shown: !bar.hidden && bar.offsetHeight > 0, text: bar.textContent.replace(/\s+/g, " ").trim(), campFirst: main.top < side.top }; });
        check("UI phone: the open campaign comes before the campaign list", fb.campFirst);
        check("UI phone: a fight under way shows the fight bar with the round and whose turn it is", fb.shown && /Round 2/.test(fb.text) && /Goblin 1/.test(fb.text) && /next Goblin 2/.test(fb.text), fb.text);
        await ph.click("[data-fight-next]"); await ph.waitForTimeout(250);
        const moved = await ph.evaluate(id => { const e = curCamp().encounters.find(x => x.id === id); return { turn: e.enemies.findIndex(m => m.id === e.turn), bar: document.querySelector("#fightBar").textContent.replace(/\s+/g, " ") }; }, fb.id);
        check("UI phone: the fight bar's Next turn moves to the next creature", moved.turn === 1 && /Goblin 2/.test(moved.bar), JSON.stringify(moved));
        await ph.goto(URL + "#roster"); await ph.waitForTimeout(200);
        const barGone = await ph.evaluate(() => document.querySelector("#fightBar").hidden);
        await ph.click('#mobileNavLinks a[href="#tracker"]').catch(() => {}); await ph.waitForTimeout(400);
        const inView = await ph.evaluate(() => { const r = document.querySelector("#view-tracker .encard.live"); if (!r) return "none"; const b = r.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; });
        check("UI phone: the fight bar hides on other tabs, and the Encounter shortcut jumps to the fight", barGone && inView === true, JSON.stringify([barGone, inView]));
        await ph.evaluate(() => { const c = curCamp(); c.encounters = []; Store.save(c); });
      }
      // QA-7: the Tracker's encounter boxes are labelled, and the campaign name gets its own line
      await ph.goto(URL + "#tracker"); await ph.waitForFunction(() => typeof newEncounter === "function");
      await ph.click("#newCamp"); await ph.waitForTimeout(200);
      const trk = await ph.evaluate(() => {
        const c = curCamp(); c.name = "A Rather Long Campaign Name For Phones"; c.encounters = [newEncounter(null, "Fight", 3, [{ name: "Goblin", stat: "Goblin", cr: 0.25, count: 1, boss: false }])];
        Store.save(c); subTab = "encounters"; renderTracker();
        const td = [...document.querySelectorAll(".foes:not(.pg-table) tbody tr:first-child td")].map(x => getComputedStyle(x, "::before").content);
        const t = document.querySelector(".camp-title-row .title-input").getBoundingClientRect(), b = document.querySelector("#exportCamp").getBoundingClientRect();
        return { labels: td.slice(1, 6), titleWide: t.width > innerWidth * 0.6, below: b.top >= t.bottom - 1 };
      });
      check(`${width} px: Tracker encounter boxes are labelled; the campaign name has room`, trk.labels.join() === '"AC","HP","Damage / heal","Init","Conditions"' && trk.titleWide && trk.below, JSON.stringify(trk));
      await ph.goto(URL + "#roster"); await ph.waitForFunction(() => typeof mobileNavSync === "function");
      check(`${width} px: bottom bar words aren't split or cut off`, nav.some(n => n.t === "Compendium") && nav.every(n => n.lines === 1 && !n.over), JSON.stringify(nav));
      await ph.context().close();
    }
    check("no page errors", !errs.length, errs.join(" | "));
  } catch (e) { console.error(e); fails++; }
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll QA fix checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
