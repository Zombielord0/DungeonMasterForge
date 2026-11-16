// NPC pictures: upload, link, show on the TV without distortion. Run with:  npm run test:npcpic
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
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
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const dm = await ctx.newPage(); dm.on("pageerror", e => errs.push("dm: " + e.message));
  await dm.goto(URL + "#tracker"); await dm.waitForFunction(() => typeof hostStart === "function");
  await dm.evaluate(() => {
    const c = blankCampaign("Pictures"); c.npcs = [{ id: "n1", name: "Aldric", role: "Innkeeper", attitude: "Friendly", notes: "Secret: owes the guild" }];
    Store.save(c); activeId = c.id; subTab = "npcs"; renderTracker();
  });
  // make test pictures in the browser: wide 2000x1000 and tall 600x1200 PNGs
  const png = (w, h) => dm.evaluate(([w, h]) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d"); g.fillStyle = "#c33"; g.fillRect(0, 0, w, h); g.fillStyle = "#3c3"; g.fillRect(0, 0, w / 2, h / 2); return cv.toDataURL("image/png").split(",")[1]; }, [w, h]).then(b => Buffer.from(b, "base64"));
  const wide = { name: "wide.png", mimeType: "image/png", buffer: await png(2000, 1000) };
  const tall = { name: "tall.png", mimeType: "image/png", buffer: await png(600, 1200) };
  const upload = async file => { const [fc] = await Promise.all([dm.waitForEvent("filechooser"), dm.click('.npc-pic [data-npcpic="add"][data-id="n1"]')]); await fc.setFiles(file); };
  const camp = () => dm.evaluate(() => curCamp().npcs.find(n => n.id === "n1"));
  const toastText = () => dm.textContent("#toast");

  // 1. the frame
  check("each NPC has a picture frame", await dm.$('.npc-pic [data-npcpic="add"][data-id="n1"]') !== null);
  check("an empty frame offers a link", await dm.$('.npc-pic [data-npcpic="link"][data-id="n1"]') !== null);
  check("an empty frame has no Show on TV", await dm.$('.npc-pic [data-npcpic="tv"][data-id="n1"]') === null);

  // 2. upload a wide picture
  await upload(wide);
  await dm.waitForFunction(() => { const i = document.querySelector(".npc-pic img"); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 8000 }).catch(() => { });
  const nat = await dm.evaluate(() => { const i = document.querySelector(".npc-pic img"); return i ? [i.naturalWidth, i.naturalHeight] : null; });
  check("an uploaded picture shows in the frame", !!nat);
  check("big pictures are shrunk to at most 2048 px and keep their shape", nat && nat[0] <= 2048 && Math.abs(nat[0] / nat[1] - 2) < .02, JSON.stringify(nat));
  check("the NPC remembers its picture", (await camp()).img === "npc-n1");
  check("the picture is stored on this computer", await dm.evaluate(async () => !!(await MAPIMG.get("npc-n1"))));
  check("the frame never stretches or crops", await dm.evaluate(() => getComputedStyle(document.querySelector(".npc-pic img")).objectFit) === "contain");

  // 3. reload keeps it (campaign saves are written 600 ms after a change)
  await dm.waitForTimeout(900); await dm.reload(); await dm.waitForFunction(() => typeof hostStart === "function");
  await dm.evaluate(() => { subTab = "npcs"; renderTracker(); });
  check("the picture is still there after a reload", await dm.waitForFunction(() => { const i = document.querySelector(".npc-pic img"); return i && i.naturalWidth > 0; }, null, { timeout: 8000 }).then(() => true, () => false));

  // 4. a file that isn't a picture
  await upload({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a picture") });
  await dm.waitForTimeout(500);
  check("a non-picture is refused with a message", /Couldn't open that picture/.test(await toastText()), await toastText());
  check("a refused file leaves the picture alone", (await camp()).img === "npc-n1");

  // 5. show on the TV, wide then tall, without distortion
  const [tv] = await Promise.all([ctx.waitForEvent("page"), dm.click('.npc-pic [data-npcpic="tv"][data-id="n1"]')]);
  tv.on("pageerror", e => errs.push("tv: " + e.message));
  await tv.waitForSelector("#tv"); await dm.bringToFront();
  const frames = () => tv.evaluate(() => window.tvFrames || 0);
  const waitFrame = n => tv.waitForFunction(n => (window.tvFrames || 0) > n && window.tvRect, n, { timeout: 10000 }).then(() => true, () => false);
  check("Show on TV sends the picture", await waitFrame(0));
  check("the TV is showing the picture as a handout", await dm.evaluate(() => HOST.show === "handout"));
  let R = await tv.evaluate(() => window.tvRect);
  check("a wide picture keeps its shape on the TV", R && Math.abs(R.w / R.h - 2) < .02, JSON.stringify(R));
  await upload(tall); await dm.waitForTimeout(800);
  let n = await frames();
  await dm.click('.npc-pic [data-npcpic="tv"][data-id="n1"]');
  check("a second Show on TV sends again", await waitFrame(n));
  R = await tv.evaluate(() => window.tvRect);
  check("a tall picture keeps its shape on the TV", R && Math.abs(R.w / R.h - .5) < .01, JSON.stringify(R));

  // 6. links
  dm.once("dialog", d => d.accept("http://example.com/a.png"));
  await dm.click('.npc-pic [data-npcpic="link"][data-id="n1"]'); await dm.waitForTimeout(300);
  check("a non-https link is refused", /https/.test(await toastText()) && !(await camp()).imgUrl, await toastText());
  dm.once("dialog", d => d.accept("https://pictures.invalid/aldric.png"));
  await dm.click('.npc-pic [data-npcpic="link"][data-id="n1"]'); await dm.waitForTimeout(300);
  const linked = await camp();
  check("an https link is saved", linked.imgUrl === "https://pictures.invalid/aldric.png");
  check("a link replaces the uploaded picture", !linked.img && !(await dm.evaluate(async () => await MAPIMG.get("npc-n1"))));
  await dm.click('.npc-pic [data-npcpic="tv"][data-id="n1"]'); await dm.waitForTimeout(1500);
  check("a link the Forge can't copy explains why", /Add picture/.test(await toastText()), await toastText());

  // 7. remove, and delete cleans up
  await dm.click('.npc-pic [data-npcpic="clear"][data-id="n1"]'); await dm.waitForTimeout(200);
  const cleared = await camp();
  check("Remove clears the picture", !cleared.img && !cleared.imgUrl);
  await upload(wide); await dm.waitForTimeout(800);
  await dm.click('[data-del="npcs"][data-id="n1"]'); await dm.click("#modalYes"); await dm.waitForTimeout(500);
  check("deleting the NPC deletes its stored picture", !(await dm.evaluate(async () => await MAPIMG.get("npc-n1"))));

  // 8. a picture that isn't on this device
  await dm.evaluate(() => { const c = curCamp(); c.npcs = [{ id: "n2", name: "Bram", role: "", attitude: "Unknown", notes: "", img: "npc-gone" }]; Store.save(c); renderTracker(); });
  await dm.waitForTimeout(500);
  check("a picture missing from this device says so", /not on this device/i.test(await dm.textContent(".npc-pic")), await dm.textContent(".npc-pic"));

  // the TV never gets NPC text
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll NPC picture checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
