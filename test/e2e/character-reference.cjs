const assert = require("node:assert/strict");
const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const root = path.join(__dirname, "../../public");
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const file = path.join(root, url.pathname === "/" ? "index.html" : url.pathname);
    try {
      const body = await readFile(file);
      const type = { ".css": "text/css", ".js": "text/javascript", ".html": "text/html" }[path.extname(file)];
      if (type) res.setHeader("Content-Type", type);
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    page.setDefaultTimeout(8000);
    await page.goto(`http://127.0.0.1:${server.address().port}/#roster`);
    await page.locator("#forgeBox > summary").click();
    await page.selectOption("#pcClass", "Fighter");
    await page.locator('#pcForm [data-progression="class"]').click();
    const dialog = page.locator("#characterReference");
    const rows = dialog.locator("tbody tr");
    assert.equal(await rows.count(), 20);
    assert.match(await rows.nth(1).textContent(), /Tactical Mind/);
    await dialog.locator("select").selectOption("Champion");
    assert.match(await rows.nth(2).textContent(), /Improved Critical/);
    assert.match(await rows.nth(19).textContent(), /Three Extra Attacks/);
    await page.keyboard.press("Escape");
    assert.equal(await dialog.isVisible(), false);
    await page.selectOption("#pcClass", "Ranger");
    await page.locator('#pcForm [data-progression="class"]').click();
    assert.match(await rows.nth(19).textContent(), /Hunter’s Mark uses a d10/);
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.locator('label.opt:has(input[name="pcEd"][value="2014"])').click();
    await page.selectOption("#pcClass", "Fighter");
    await page.locator('#pcForm [data-progression="class"]').click();
    assert.doesNotMatch(await rows.nth(1).textContent(), /Tactical Mind/);
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.selectOption("#pcRace", "Elf");
    await page.selectOption("#pcAnc", "Drow");
    await page.locator('#pcForm [data-progression="species"]').click();
    assert.match(await rows.nth(2).textContent(), /Faerie Fire/);
    await dialog.getByRole("button", { name: "Close" }).click();

    await page.evaluate(() => {
      const c = pcEnsure(generateCharacter({ seed: "REF", name: "Ash", ed: "2024", cls: "Fighter", level: 1 }));
      PCS.roster = [c];
      RC.id = c.id;
      pcInvUpgrade(c);
      itLoad();
      for (const ed of ["2014", "2024"]) {
        const flameTongue = IT.data[ed].find(item => item.n === "Flame Tongue");
        const choices = inventoryWeaponChoices(flameTongue, ed);
        if (!choices.some(item => item.n === "Longsword") ||
            choices.some(item => item.n === "Longbow") ||
            choices.some(item => item.n === "Dagger") !== (ed === "2024")) {
          throw new Error("Unexpected Flame Tongue base weapons for " + ed);
        }
      }
      const arrows = IT.data["2014"].find(item => item.type?.startsWith("Weapon (any ammunition)"));
      if (inventoryWeaponChoices(arrows, "2014").length) throw new Error("Ammunition should not offer a base weapon");
      for (const [id, pattern] of [["test-sword", /^Weapon \+1$/], ["test-ring", /^Ring of Free Action$/]]) {
        const x = IT.data["2024"].find(item => pattern.test(item.n));
        c.inv.push({ id, ref: x.id, n: x.n, qty: 1, att: !!x.att });
      }
      c.inv.push({
        id: "test-custom", n: "Custom charm", qty: 1, eq: true,
        itemRules: { kind: "custom", cat: "Wondrous Item", d: "<strong>Shared rules</strong>" },
      });
      renderRosterTab();
    });
    await page.locator('#rosterMain [data-progression="class"]').click();
    await dialog.locator("select").selectOption("Champion");
    assert.match(await rows.nth(2).textContent(), /Improved Critical/);
    assert.equal(await page.evaluate(() => rosterCur().subclass), null);
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.locator('#sec-gear [data-item-details="test-sword"]').click();
    assert.match(await dialog.textContent(), /bonus to attack rolls and damage rolls/);
    await dialog.locator("[data-item-base]").selectOption("Longsword");
    assert.match(await dialog.textContent(), /1d8/i);
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.locator('[data-rinv="eq"][data-iid="test-sword"]').check();
    assert.equal(await page.evaluate(() => rosterCur().attacks.find(a => a.iid === "test-sword").magic), 1);
    await page.locator('[data-rinv="eq"][data-iid="test-ring"]').check();
    assert.doesNotMatch(await page.locator("#rcSpeedLine").textContent(), /Difficult terrain/);
    await page.locator('[data-rinv="attuned"][data-iid="test-ring"]').check();
    assert.match(await page.locator("#rcSpeedLine").textContent(), /Difficult terrain/);
    await page.locator("#rcItemFeatures").getByText("Ring of Free Action", { exact: true }).click();
    assert.match(await page.locator("#rcItemFeatures").textContent(), /Difficult Terrain doesn.t cost/i);
    await page.locator('[data-rdel="test-ring"]').click();
    assert.doesNotMatch(await page.locator("#rcSpeedLine").textContent(), /Difficult terrain/);
    assert.doesNotMatch(await page.locator("#rcItemFeatures").textContent(), /Ring of Free Action/);
    await page.locator('#sec-gear [data-item-details="test-custom"]').click();
    assert.match(await dialog.textContent(), /<strong>Shared rules<\/strong>/);
    assert.equal(await dialog.locator("strong").count(), 0);
    await dialog.getByRole("button", { name: "Close" }).click();
    assert.deepEqual(errors, []);
    console.log("PASS edition-aware progression, item stats, enhancement, attunement and removal");
  } finally {
    await browser?.close();
    server.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
