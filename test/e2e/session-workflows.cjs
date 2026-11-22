const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/json" };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});
const assert = require("node:assert/strict");

(async () => {
  await new Promise(resolve => server.listen(0, resolve));
  const root = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem("dmforge.offline", "1");
      localStorage.setItem("dmforge.newsSeen", "9999");
    });
    await page.goto(root + "#roster");
    await page.evaluate(() => {
      currentPC = pcEnsure(generateCharacter({ seed: "READY", cls: "Fighter", race: "Dwarf", bg: "Acolyte", level: 3, subclass: "none", ed: "2024" }));
      currentPC.importReview = ["An imported item needs review."];
      RC.id = currentPC.id;
      renderRosterTab();
    });
    await page.getByRole("button", { name: /Magic Initiate · Choose cantrips/ }).click();
    assert.equal(await page.locator(":focus").getAttribute("data-mi"), "c");
    await page.locator('[data-mi="c"]').selectOption("Guidance");
    await page.locator('[data-mi="c"]').selectOption("Thaumaturgy");
    assert.equal(await page.getByRole("button", { name: /Magic Initiate · Choose cantrips/ }).count(), 0);
    await page.getByText("Review import differences", { exact: true }).click();
    await page.getByRole("button", { name: "Mark import reviewed" }).click();
    assert.equal(await page.getByText("Review import differences", { exact: true }).count(), 0);
    console.log("PASS", "readiness links reach feat choices and acknowledge import findings");

    await page.goto(root + "#tracker");
    await page.evaluate(() => {
      const c = blankCampaign("Queue and combat");
      const e = newEncounter(null, "Gate Patrol", 1, [{ stat: "Goblin", name: "Goblin", cr: .25, count: 1 }]);
      c.encounters.push(e);
      c.loot.push({ id: "loot-test", item: "Bronze key" });
      Store.save(c); activeId = c.id; subTab = "session"; renderTracker();
    });
    await page.locator("#nextSessionForm select").selectOption("loot|loot-test");
    await page.getByRole("button", { name: "Add to queue" }).click();
    await page.goto(root + "#compendium");
    await page.locator("#compendiumType").selectOption("Spell");
    await page.locator("#compendiumQuery").fill("Misty Step");
    await page.getByRole("button", { name: "Queue Misty Step for next session", exact: true }).first().click();
    await page.goto(root + "#tracker");
    await page.getByRole("button", { name: "Open Session", exact: true }).click();
    await page.getByRole("button", { name: "Move Misty Step up" }).click();
    assert.match(await page.locator(".next-session li").first().innerText(), /Misty Step/);
    await page.locator(".next-session li").first().getByRole("button", { name: "Open", exact: true }).click();
    await page.getByRole("heading", { name: "Misty Step", exact: true }).waitFor();
    await page.keyboard.press("Escape");
    console.log("PASS", "queue adds campaign and Compendium entries, reorders, and opens an exact reference");

    await page.goto(root + "#tracker");
    await page.getByRole("button", { name: /^Encounters/ }).click();
    const encounter = page.locator(".encard").first();
    const initial = Number(await encounter.locator('[data-ef="hp"]').inputValue());
    await encounter.getByRole("button", { name: /Roll enemy initiative/ }).click();
    await encounter.getByText("Round 1", { exact: true }).waitFor();
    await encounter.getByRole("button", { name: /Next turn/ }).click();
    await encounter.getByText("Round 2", { exact: true }).waitFor();
    await encounter.getByRole("spinbutton", { name: "Amount" }).fill("3");
    await encounter.locator('[data-ea="dmg"]').click();
    await page.waitForFunction(value => Number(document.querySelector('[data-ef="hp"]').value) === value, initial - 3);
    await encounter.locator('[data-ef="notes"]').fill("Keep this note");
    await encounter.getByRole("button", { name: "Undo combat action" }).click();
    await page.waitForFunction(value => Number(document.querySelector('[data-ef="hp"]').value) === value, initial);
    assert.equal(await encounter.locator('[data-ef="notes"]').inputValue(), "Keep this note");
    await encounter.getByRole("button", { name: "Undo combat action" }).click();
    await encounter.getByText("Round 1", { exact: true }).waitFor();
    await encounter.locator('[data-ef="cond"]').fill("prone");
    await encounter.locator('[data-ef="cond"]').press("Tab");
    await encounter.getByText("Combat history (4)").waitFor();
    await encounter.getByRole("button", { name: "Undo combat action" }).click();
    await page.waitForFunction(() => document.querySelector('[data-ef="cond"]').value === "");
    await page.evaluate(() => Store.flush(activeId));
    await page.reload();
    await page.getByRole("button", { name: /^Encounters/ }).click();
    await encounter.getByText("Combat history (4)").click();
    assert.match(await encounter.locator(".combat-history").innerText(), /took 3 damage · Undone/);
    assert.deepEqual(errors, []);
    console.log("PASS", "combat history persists and undoes damage, turn advance, and conditions without changing notes");
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
