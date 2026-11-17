import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { NetlifyDB } from "@netlify/database-dev";
import pg from "pg";
import { handle } from "../netlify/lib/api.mjs";
import { describeChange } from "../netlify/lib/diff.mjs";

let ndb, pool;
before(async () => {
  ndb = new NetlifyDB();
  const cs = await ndb.start();
  await ndb.applyMigrations("./netlify/database/migrations");
  pool = new pg.Pool({ connectionString: cs, max: 1 });
});
after(async () => { await pool?.end(); await ndb?.stop(); });

const DM = { id: "u-dm", email: "dm@example.com" };
const AVA = { id: "u-ava", email: "ava@example.com" };
const BEN = { id: "u-ben", email: "ben@example.com" };

async function call(user, method, path, body) {
  const req = new Request("https://forge.test/api/" + path, {
    method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
  });
  const res = await handle(req, user, pool);
  return { status: res.status, body: await res.json() };
}

const thorin = { id: "pc-thorin", name: "Thorin", level: 5, hpCur: 44, hp: 44, ac: 18, inv: [], prepared: [] };

test("describeChange summarises the edits a DM cares about", () => {
  assert.equal(describeChange(thorin, { ...thorin, hpCur: 31 }), "HP 44 → 31");
  assert.equal(
    describeChange(thorin, { ...thorin, inv: [{ n: "Potion of Healing", qty: 2 }] }),
    "added 2 × Potion of Healing");
  assert.equal(describeChange({ ...thorin, prepared: [{ n: "Fireball" }] }, thorin), "unprepared Fireball");
  assert.equal(describeChange(thorin, { ...thorin }), "");
  assert.equal(describeChange(thorin, { ...thorin, companions: [{ n: "Wolf", hp: 11 }] }), "gained companion Wolf");
  assert.equal(describeChange({ ...thorin, scores: { str: 1, dex: 2 } }, { ...thorin, scores: { dex: 2, str: 1 } }), "", "key order is not a change");
  // opening a sheet fills in empty fields and recalculates modifiers: not a change
  assert.equal(describeChange(thorin, { ...thorin, coins: { gp: 0, sp: 0 }, feats: [], mods: { str: 3 }, init: 2 }), "");
  assert.equal(describeChange({ ...thorin, coins: { gp: 0 } }, { ...thorin, coins: { gp: 50 } }), "GP 0 → 50");
  assert.equal(describeChange({ ...thorin, scores: { str: 16, dex: 12 } }, { ...thorin, scores: { str: 17, dex: 12 }, mods: { str: 3 } }), "STR 16 → 17");
});

test("full campaign flow", async (t) => {
  assert.equal((await call(null, "GET", "me")).status, 401);

  const made = await call(DM, "POST", "campaigns", { name: "Ashes of Velmor", displayName: "Matt" });
  assert.equal(made.status, 201);
  assert.match(made.body.code, /^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
  const cid = made.body.id;

  await t.test("players join with the code, typed loosely", async () => {
    const bad = await call(AVA, "POST", "join", { code: "ZZZ-ZZZ", displayName: "Ava" });
    assert.equal(bad.status, 404);
    const ok = await call(AVA, "POST", "join", { code: made.body.code.toLowerCase().replace("-", " "), displayName: "Ava" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.role, "player");
    await call(BEN, "POST", "join", { code: made.body.code, displayName: "Ben" });
    const me = await call(AVA, "GET", "me");
    assert.equal(me.body.campaigns[0].code, undefined, "players never see the join code");
  });

  await t.test("players only see their own characters, the DM sees all", async () => {
    assert.equal((await call(AVA, "POST", `campaigns/${cid}/characters`, { data: thorin })).status, 201);
    await call(BEN, "POST", `campaigns/${cid}/characters`, { data: { id: "pc-lyra", name: "Lyra", hpCur: 22 } });
    const ben = await call(BEN, "GET", `campaigns/${cid}/characters`);
    assert.deepEqual(ben.body.characters.map(c => c.name ?? c.data.name), ["Lyra"]);
    const dm = await call(DM, "GET", `campaigns/${cid}/characters`);
    assert.deepEqual(dm.body.characters.map(c => c.data.name).sort(), ["Lyra", "Thorin"]);
    assert.equal(dm.body.characters.find(c => c.id === "pc-thorin").ownerName, "Ava");
  });

  await t.test("a player can't touch someone else's sheet", async () => {
    const r = await call(BEN, "PUT", `campaigns/${cid}/characters/pc-thorin`, { data: thorin, baseVersion: 1 });
    assert.equal(r.status, 403);
    const outsider = await call({ id: "u-x" }, "GET", `campaigns/${cid}/characters`);
    assert.equal(outsider.status, 403);
  });

  await t.test("DM edits and simultaneous-edit warning", async () => {
    const ava = await call(AVA, "PUT", `campaigns/${cid}/characters/pc-thorin`, { data: { ...thorin, hpCur: 31 }, baseVersion: 1 });
    assert.deepEqual(ava.body, { version: 2 });
    // DM still holds version 1: they get Ava's version back instead of overwriting it
    const clash = await call(DM, "PUT", `campaigns/${cid}/characters/pc-thorin`, { data: { ...thorin, ac: 19 }, baseVersion: 1 });
    assert.equal(clash.status, 409);
    assert.equal(clash.body.current.data.hpCur, 31);
    assert.equal(clash.body.current.updatedByName, "Ava");
    const forced = await call(DM, "PUT", `campaigns/${cid}/characters/pc-thorin`, { data: { ...thorin, hpCur: 31, ac: 19 }, baseVersion: 1, force: true });
    assert.deepEqual(forced.body, { version: 3 });
  });

  await t.test("activity feed folds quick edits and marks DM changes", async () => {
    await call(AVA, "PUT", `campaigns/${cid}/characters/pc-thorin`, { data: { ...thorin, hpCur: 25, ac: 19 }, baseVersion: 3 });
    await call(AVA, "PUT", `campaigns/${cid}/characters/pc-thorin`, { data: { ...thorin, hpCur: 20, ac: 19 }, baseVersion: 4 });
    const feed = await call(DM, "GET", `campaigns/${cid}/activity`);
    const lines = feed.body.map(a => `${a.actor}${a.byDM ? " (DM)" : ""}: ${a.characterName}: ${a.summary}`);
    assert.deepEqual(lines, [
      "Ava: Thorin: HP 31 → 20", // two quick HP edits in a row read as one change
      "Matt (DM): Thorin: AC 18 → 19",
      "Ava: Thorin: HP 44 → 31", // kept apart from the above: the DM edited in between
      "Ben: Lyra: created this character",
      "Ava: Thorin: created this character",
    ]);
    assert.equal((await call(AVA, "GET", `campaigns/${cid}/activity`)).status, 403);
  });

  await t.test("polling with `since` returns changes and deletions", async () => {
    const first = await call(DM, "GET", `campaigns/${cid}/characters`);
    await call(BEN, "DELETE", `campaigns/${cid}/characters/pc-lyra`);
    const next = await call(DM, "GET", `campaigns/${cid}/characters?since=${encodeURIComponent(first.body.now)}`);
    assert.deepEqual(next.body.deleted, ["pc-lyra"]);
  });

  await t.test("whispers reach only the chosen player", async () => {
    const members = await call(DM, "GET", `campaigns/${cid}/members`);
    const ava = members.body.find(p => p.name === "Ava");
    assert.equal((await call(AVA, "POST", `campaigns/${cid}/whispers`, { to: BEN.id, body: "hi" })).status, 403);
    assert.equal((await call(DM, "POST", `campaigns/${cid}/whispers`, { to: ava.id, body: "The amulet is cursed." })).status, 201);
    const avaInbox = await call(AVA, "GET", `campaigns/${cid}/whispers`);
    assert.deepEqual(avaInbox.body.map(w => [w.body, w.read]), [["The amulet is cursed.", false]]);
    assert.deepEqual((await call(BEN, "GET", `campaigns/${cid}/whispers`)).body, []);
    await call(AVA, "POST", `campaigns/${cid}/whispers/read`);
    assert.equal((await call(AVA, "GET", `campaigns/${cid}/whispers`)).body[0].read, true);
    assert.equal((await call(DM, "GET", `campaigns/${cid}/whispers`)).body[0].toName, "Ava");
  });

  await t.test("homebrew: the whole campaign reads it, only the DM writes it", async () => {
    const feat = { kind: "feat", name: "Iron Stomach", ed: "both", desc: "Advantage against poison." };
    assert.equal((await call(AVA, "PUT", `campaigns/${cid}/homebrew/hb-1`, { data: feat })).status, 403);
    assert.equal((await call(DM, "PUT", `campaigns/${cid}/homebrew/hb-1`, { data: { ...feat, kind: "spaceship" } })).status, 400);
    assert.equal((await call(DM, "PUT", `campaigns/${cid}/homebrew/hb-1`, { data: { ...feat, name: " " } })).status, 400);
    const saved = await call(DM, "PUT", `campaigns/${cid}/homebrew/hb-1`, { data: feat });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.id, "hb-1");
    await call(DM, "PUT", `campaigns/${cid}/homebrew/hb-1`, { data: { ...feat, desc: "Immune to poison." } });
    const list = await call(AVA, "GET", `campaigns/${cid}/homebrew`);
    assert.deepEqual(list.body.map(h => [h.id, h.name, h.desc]), [["hb-1", "Iron Stomach", "Immune to poison."]]);
    assert.equal((await call({ id: "u-x" }, "GET", `campaigns/${cid}/homebrew`)).status, 403);
    assert.equal((await call(AVA, "DELETE", `campaigns/${cid}/homebrew/hb-1`)).status, 403);
    await call(DM, "DELETE", `campaigns/${cid}/homebrew/hb-1`);
    assert.deepEqual((await call(BEN, "GET", `campaigns/${cid}/homebrew`)).body, []);
  });

  await t.test("homebrew spells: only the DM adds them", async () => {
    const spell = { kind: "spell", name: "Cheers", ed: "2014", desc: "Drinks for all.", l: 0, s: "Enchantment", c: ["Wizard"] };
    assert.equal((await call(AVA, "PUT", `campaigns/${cid}/homebrew/hb-sp`, { data: spell })).status, 403);
    assert.equal((await call(DM, "PUT", `campaigns/${cid}/homebrew/hb-sp`, { data: spell })).status, 200);
    const list = await call(AVA, "GET", `campaigns/${cid}/homebrew`);
    assert.deepEqual(list.body.map(h => [h.kind, h.name]), [["spell", "Cheers"]]);
    await call(DM, "DELETE", `campaigns/${cid}/homebrew/hb-sp`);
  });

  await t.test("only the DM can rename the campaign", async () => {
    assert.equal((await call(AVA, "PUT", `campaigns/${cid}`, { name: "Mine now" })).status, 403);
    assert.equal((await call(DM, "PUT", `campaigns/${cid}`, { name: "   " })).status, 400);
    const r = await call(DM, "PUT", `campaigns/${cid}`, { name: "  Embers of Velmor  " });
    assert.equal(r.status, 200);
    assert.equal(r.body.name, "Embers of Velmor");
    const me = await call(AVA, "GET", "me");
    assert.equal(me.body.campaigns.find(c => c.id === cid).name, "Embers of Velmor");
    await call(DM, "PUT", `campaigns/${cid}`, { name: "Ashes of Velmor" });
  });

  await t.test("DM can remove a player", async () => {
    await call(DM, "DELETE", `campaigns/${cid}/members/${BEN.id}`);
    assert.equal((await call(BEN, "GET", `campaigns/${cid}/characters`)).status, 403);
  });
});

test("two saves of one sheet at the same moment: one wins, the other is asked", async () => {
  const kit = { id: "u-kit", email: "kit@example.com" }, rue = { id: "u-rue", email: "rue@example.com" };
  const made = await call(kit, "POST", "campaigns", { name: "Race Test", displayName: "Kit" });
  const cid = made.body.id;
  await call(rue, "POST", "join", { code: made.body.code, displayName: "Rue" });
  const pc = { id: "pc-race", name: "Pip", hpCur: 10 };
  // creating the same character twice at once: one is made, the other is told it exists (not a server error)
  const [c1, c2] = await Promise.all([
    call(rue, "POST", `campaigns/${cid}/characters`, { data: pc }),
    call(rue, "POST", `campaigns/${cid}/characters`, { data: pc }),
  ]);
  assert.deepEqual([c1.status, c2.status].sort(), [201, 409]);
  // the player and the DM both save from version 1 at once
  const [a, b] = await Promise.all([
    call(rue, "PUT", `campaigns/${cid}/characters/pc-race`, { data: { ...pc, hpCur: 4 }, baseVersion: 1 }),
    call(kit, "PUT", `campaigns/${cid}/characters/pc-race`, { data: { ...pc, hpCur: 15 }, baseVersion: 1 }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409], "exactly one save wins");
  const loser = a.status === 409 ? a : b, winner = a.status === 409 ? b : a;
  assert.equal(winner.body.version, 2);
  assert.equal(loser.body.current.version, 2, "the other is handed the winning version");
  const now = (await call(kit, "GET", `campaigns/${cid}/characters`)).body.characters[0];
  assert.equal(now.version, 2);
  assert.equal(now.data.hpCur, loser.body.current.data.hpCur);
  // the activity feed describes the save that won, from the version it replaced
  const feed = (await call(kit, "GET", `campaigns/${cid}/activity`)).body.map(x => x.summary);
  assert.equal(feed.filter(x => /HP 10 →/.test(x)).length, 1, feed.join(" | "));
});

test("a DM can create a campaign without naming it", async () => {
  const r = await call({ id: "u-new", email: "new@example.com" }, "POST", "campaigns", {});
  assert.equal(r.status, 201);
  assert.equal(r.body.name, "New Campaign");
  assert.equal(r.body.displayName, "DM");
});

test("each account keeps its own private saved data (Tracker, World, NPCs)", async t => {
  const camp = { id: "c-velmor", name: "Ashes of Velmor", npcs: [{ id: "n1", name: "Sera" }] };
  await t.test("starts empty", async () => {
    const r = await call(DM, "GET", "me/docs");
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { docs: [], deleted: [] });
  });
  await t.test("saving a new doc gives version 1", async () => {
    const r = await call(DM, "PUT", "me/docs/c-velmor", { data: camp, baseVersion: 0 });
    assert.equal(r.status, 200);
    assert.equal(r.body.version, 1);
  });
  await t.test("saving from an older copy is refused with the current one", async () => {
    const ok = await call(DM, "PUT", "me/docs/c-velmor", { data: { ...camp, name: "Velmor" }, baseVersion: 1 });
    assert.equal(ok.body.version, 2);
    const clash = await call(DM, "PUT", "me/docs/c-velmor", { data: { ...camp, name: "Old copy" }, baseVersion: 1 });
    assert.equal(clash.status, 409);
    assert.equal(clash.body.current.version, 2);
    assert.equal(clash.body.current.data.name, "Velmor");
    const forced = await call(DM, "PUT", "me/docs/c-velmor", { data: { ...camp, name: "Old copy" }, baseVersion: 1, force: true });
    assert.equal(forced.body.version, 3);
  });
  await t.test("a new doc with an id that's already saved is a clash", async () => {
    const r = await call(DM, "PUT", "me/docs/c-velmor", { data: camp, baseVersion: 0 });
    assert.equal(r.status, 409);
  });
  await t.test("nobody else can see it", async () => {
    const r = await call(AVA, "GET", "me/docs");
    assert.deepEqual(r.body.docs, []);
    const w = await call(AVA, "PUT", "me/docs/c-velmor", { data: { name: "Ava's own" }, baseVersion: 0 });
    assert.equal(w.status, 200, "the same id in another account is a separate doc");
    const mine = await call(DM, "GET", "me/docs");
    assert.equal(mine.body.docs.find(d => d.id === "c-velmor").data.name, "Old copy");
  });
  await t.test("deleting leaves a marker so other devices drop their copy", async () => {
    await call(DM, "PUT", "me/docs/world", { data: { places: [{ id: "p1", name: "Velmor" }] }, baseVersion: 0 });
    const d = await call(DM, "DELETE", "me/docs/c-velmor");
    assert.equal(d.status, 200);
    const r = await call(DM, "GET", "me/docs");
    assert.deepEqual(r.body.docs.map(x => x.id), ["world"]);
    assert.deepEqual(r.body.deleted, ["c-velmor"]);
    const again = await call(DM, "PUT", "me/docs/c-velmor", { data: camp, baseVersion: 0 });
    assert.equal(again.status, 200, "a deleted id can be saved again");
    assert.deepEqual((await call(DM, "GET", "me/docs")).body.deleted, []);
  });
  await t.test("two devices saving from the same copy at once: one is told to merge", async () => {
    const base = (await call(DM, "PUT", "me/docs/mymonsters", { data: [{ id: "m1" }], baseVersion: 0 })).body.version;
    const [x, y] = await Promise.all([
      call(DM, "PUT", "me/docs/mymonsters", { data: [{ id: "m1" }, { id: "m2" }], baseVersion: base }),
      call(DM, "PUT", "me/docs/mymonsters", { data: [{ id: "m1" }, { id: "m3" }], baseVersion: base }),
    ]);
    assert.deepEqual([x.status, y.status].sort(), [200, 409]);
  });
  await t.test("a list (Your NPCs, My monsters) saves and comes back as a list", async () => {
    const npcs = [{ id: "nl-1", name: "Old Tom" }, { id: "nl-2", name: "Sera" }];
    const r = await call(DM, "PUT", "me/docs/npclib", { data: npcs, baseVersion: 0 });
    assert.equal(r.status, 200);
    assert.deepEqual((await call(DM, "GET", "me/docs")).body.docs.find(d => d.id === "npclib").data, npcs);
  });
  await t.test("bad ids, missing data and oversized docs are refused", async () => {
    assert.equal((await call(DM, "PUT", "me/docs/../x", { data: {} })).status, 404);
    assert.equal((await call(DM, "PUT", "me/docs/has%20space", { data: {} })).status, 400);
    assert.equal((await call(DM, "PUT", "me/docs/c-x", {})).status, 400);
    const big = { notes: "x".repeat(4_100_000) };
    assert.equal((await call(DM, "PUT", "me/docs/c-big", { data: big, baseVersion: 0 })).status, 413);
  });
  await t.test("signed out: refused", async () => {
    assert.equal((await call(null, "GET", "me/docs")).status, 401);
  });
});
