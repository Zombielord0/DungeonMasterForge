// The side menu when signed in (2026-11-24): every page a DM and a player can see opens from the menu with no error,
// players' menus and searches hold no DM tabs or campaign notes. Part of:  npm run test:sidebar
// Builds the portal with the stand-in sign-in and starts the local copy (app + API + in-memory database) on port 8892.
const { spawn } = require("child_process"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", ".."), PORT = 8892, URL = `http://localhost:${PORT}/`;
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };

async function walk(p, who, phone) {
  const links = await p.evaluate(() => [...document.querySelectorAll("#fside nav a[data-view]")].filter(a => !a.hidden).map(a => a.dataset.view));
  for (const v of links) {
    p.__errs.length = 0;
    if (phone) { await p.click("#mobileMore"); await p.waitForTimeout(250); }
    await p.click(`#fside nav a[data-view="${v}"]`); await p.waitForTimeout(600);
    const st = await p.evaluate(v => { const s = document.querySelector("section.view.active"); return { id: s && s.id, text: s ? s.innerText.trim().length : 0 }; }, v);
    check(`${who}: ${v} opens`, st.id === "view-" + v && st.text > 0 && !p.__errs.length, JSON.stringify(st) + " " + p.__errs.join(" | "));
    const secs = await p.evaluate(v => [...document.querySelectorAll(`#fside [data-subs-of="${v}"] [data-side-sec]`)].map(b => b.dataset.sideSec), v);
    for (const s of secs) {
      p.__errs.length = 0;
      if (phone) { await p.click("#mobileMore"); await p.waitForTimeout(250); }
      const arrow = `#fside [data-side-toggle="${v}"]`;
      if (await p.getAttribute(arrow, "aria-expanded") !== "true") await p.click(arrow);
      await p.click(`#fside [data-side-go="${v}"][data-side-sec="${s}"]`); await p.waitForTimeout(450);
      const ok = await p.evaluate(v => document.querySelector("section.view.active")?.id === "view-" + v, v);
      check(`${who}: ${v} → ${s} opens`, ok && !p.__errs.length, p.__errs.join(" | "));
    }
  }
  return links;
}

(async () => {
  require("esbuild").buildSync({ absWorkingDir: ROOT, entryPoints: ["src/portal.js"], bundle: true, format: "esm", alias: { "@netlify/identity": "./test/e2e/fake-identity.js" }, outfile: ".dev/portal-sidebar.js", logLevel: "error" });
  const srv = spawn(process.execPath, ["test/e2e/server.mjs", ".dev/portal-sidebar.js", String(PORT)], { cwd: ROOT });
  await new Promise((res, rej) => { srv.stdout.on("data", d => { if (/running/.test(String(d))) res(); }); srv.on("exit", c => rej(new Error("server exited " + c))); setTimeout(() => rej(new Error("server didn't start")), 20000); });
  const browser = await chromium.launch();
  try {
    const mk = async phone => {
      const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true, serviceWorkers: "block" } : { viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
      const p = await ctx.newPage(); p.__errs = [];
      p.on("pageerror", e => p.__errs.push(e.message));
      p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.__errs.push(m.text()); });
      return p;
    };
    const ready = p => p.waitForFunction(() => typeof renderTracker === "function" && window.Portal);
    const signUp = async (p, name, email) => {
      await p.goto(URL); await ready(p); await p.waitForSelector("#gate.open");
      await p.click("text=New here? Create an account");
      await p.fill("#gName", name); await p.fill("#gEmail", email); await p.fill("#gPass", "password123");
      await p.click("#gateForm button[type=submit]");
    };
    const dm = await mk();
    await signUp(dm, "Kit", "kit@example.com"); await dm.waitForSelector("#dmForm");
    await dm.fill("#dCamp", "Velmor"); await dm.click("#dmForm button[type=submit]");
    await dm.waitForFunction(() => Portal.cloud && Portal.isDM(), null, { timeout: 15000 });
    const code = await dm.evaluate(async () => (await (await fetch("/api/me")).json()).campaigns[0].code);
    await dm.evaluate(() => { const c = Store.list()[0]; if (c) { c.loot = [{ id: "lt1", name: "Secret dragon hoard", notes: "" }]; Store.save(c); } });
    await dm.waitForTimeout(800);

    const dmLinks = await walk(dm, "DM");
    check("DM: the menu has the Tracker and the Party tab", dmLinks.includes("tracker") && dmLinks.includes("party"));
    check("DM: the Players heading shows", await dm.evaluate(() => [...document.querySelectorAll("#fside .fside-grp")].some(h => !h.hidden && h.textContent === "Players")));

    const pl = await mk(true);
    await signUp(pl, "Pia", "pia@example.com"); await pl.waitForSelector("#jCode");
    await pl.fill("#jCode", code); await pl.fill("#jName", "Pia"); await pl.click("#joinForm button[type=submit]");
    await pl.waitForFunction(() => Portal.cloud && !Portal.isDM(), null, { timeout: 15000 });
    await pl.waitForTimeout(500);
    const plLinks = await walk(pl, "player (phone)", true);
    check("player: Characters, Spells, Journal and Chat; no Tracker, Map or World", ["roster", "spells", "journal", "whispers"].every(v => plLinks.includes(v)) && !["tracker", "map", "world", "npc", "generate"].some(v => plLinks.includes(v)), plLinks.join(","));
    await pl.click("#mobileMore"); await pl.waitForTimeout(250);
    await pl.fill("#sideQ", "dragon hoard"); await pl.waitForTimeout(1200);
    check("player: a search shows no campaign notes", await pl.evaluate(() => !/Secret dragon hoard|Campaign "/.test(document.querySelector("#sideResults").textContent)));
    await pl.fill("#sideQ", "loot"); await pl.waitForTimeout(1200);
    check("player: a search shows no DM tabs", await pl.evaluate(() => ![...document.querySelectorAll("#sideResults [data-side-hit]")].some(b => /Tracker|Loot/.test(b.textContent))));
  } catch (e) { console.error(e); fails++; }
  await browser.close(); srv.kill();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll signed-in side menu checks passed");
  process.exit(fails ? 1 : 0);
})();
