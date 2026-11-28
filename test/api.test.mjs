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

  await t.test("homebrew requests: players suggest, only the DM approves", async () => {
    const feat = { kind: "feat", name: "Lucky Hat", ed: "both", desc: "Reroll once a day.", book: true, src: "tob", pend: true };
    const base = `campaigns/${cid}/hbrequests`;
    // the DM uses the homebrew itself, not requests; a stranger can't send one
    assert.equal((await call(DM, "PUT", `${base}/hb-r1`, { data: feat })).status, 403);
    assert.equal((await call({ id: "u-x" }, "PUT", `${base}/hb-r1`, { data: feat })).status, 403);
    assert.equal((await call(AVA, "PUT", `${base}/hb-r1`, { data: { ...feat, kind: "spaceship" } })).status, 400);
    assert.equal((await call(AVA, "PUT", `${base}/bad id`, { data: feat })).status, 400);
    const sent = await call(AVA, "PUT", `${base}/hb-r1`, { data: feat });
    assert.equal(sent.status, 200);
    // a request never reaches the campaign's homebrew on its own
    assert.deepEqual((await call(BEN, "GET", `campaigns/${cid}/homebrew`)).body, []);
    // Ben sends a request for the same entry id: it is his own, not a change to Ava's
    await call(BEN, "PUT", `${base}/hb-r1`, { data: { ...feat, name: "Ben's Hat" } });
    // players see only their own requests; the DM sees everyone's, with who sent them
    const mine = (await call(AVA, "GET", base)).body;
    assert.deepEqual(mine.map(r => [r.id, r.data.name]), [["hb-r1", "Lucky Hat"]]);
    assert.equal(mine[0].data.book, undefined, "book, src and pend are stripped");
    assert.equal(mine[0].data.src, undefined);
    assert.equal(mine[0].data.pend, undefined);
    const all = (await call(DM, "GET", base)).body;
    assert.deepEqual(all.map(r => [r.userId, r.userName, r.data.name]).sort(), [["u-ava", "Ava", "Lucky Hat"], ["u-ben", "Ben", "Ben's Hat"]]);
    // players can't approve, not even their own
    assert.equal((await call(AVA, "POST", `${base}/hb-r1/approve?user=u-ava`)).status, 403);
    // Ava can't withdraw Ben's request (she only ever reaches her own)
    await call(BEN, "PUT", `${base}/hb-b1`, { data: { ...feat, name: "Ben's Boots" } });
    await call(AVA, "DELETE", `${base}/hb-b1?user=u-ben`);
    assert.equal((await call(DM, "GET", base)).body.length, 3);
    await call(BEN, "DELETE", `${base}/hb-b1`);
    // the DM approves Ava's: it joins the homebrew and the request goes
    assert.equal((await call(DM, "POST", `${base}/hb-r1/approve?user=u-nobody`)).status, 404);
    const ok = await call(DM, "POST", `${base}/hb-r1/approve?user=u-ava`);
    assert.equal(ok.status, 200);
    const hb = (await call(BEN, "GET", `campaigns/${cid}/homebrew`)).body;
    assert.deepEqual(hb.map(h => [h.id, h.name]), [["hb-r1", "Lucky Hat"]]);
    assert.deepEqual((await call(AVA, "GET", base)).body, []);
    // the DM turns down Ben's
    assert.equal((await call(DM, "DELETE", `${base}/hb-r1`)).status, 400, "the DM says whose request");
    await call(DM, "DELETE", `${base}/hb-r1?user=u-ben`);
    assert.deepEqual((await call(DM, "GET", base)).body, []);
    // a player withdraws their own
    await call(BEN, "PUT", `${base}/hb-r2`, { data: { ...feat, name: "Spare Hat" } });
    await call(BEN, "DELETE", `${base}/hb-r2`);
    assert.deepEqual((await call(DM, "GET", base)).body, []);
    await call(DM, "DELETE", `campaigns/${cid}/homebrew/hb-r1`);
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

test("Keep mine in the clash dialog (force, no baseVersion) saves instead of crashing", async () => {
  const kit = { id: "u-kit2", email: "kit2@example.com" }, rue = { id: "u-rue2", email: "rue2@example.com" };
  const made = await call(kit, "POST", "campaigns", { name: "Keep Test", displayName: "Kit" });
  const cid = made.body.id;
  await call(rue, "POST", "join", { code: made.body.code, displayName: "Rue" });
  const pc = { id: "pc-keep", name: "Pip", hpCur: 10 };
  await call(rue, "POST", `campaigns/${cid}/characters`, { data: pc });
  await call(rue, "PUT", `campaigns/${cid}/characters/pc-keep`, { data: { ...pc, hpCur: 4 }, baseVersion: 1 });
  const keepMine = await call(kit, "PUT", `campaigns/${cid}/characters/pc-keep`, { data: { ...pc, hpCur: 15 }, force: true });
  assert.equal(keepMine.status, 200);
  assert.deepEqual(keepMine.body, { version: 3 });
  const now = (await call(kit, "GET", `campaigns/${cid}/characters`)).body.characters[0];
  assert.equal(now.data.hpCur, 15);
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

test("the DM shares the Journal and turn order; players share their rolls", async () => {
  const dm = { id: "u-sh-dm", email: "shdm@example.com" }, pl = { id: "u-sh-pl", email: "shpl@example.com" }, out = { id: "u-sh-x" };
  const made = await call(dm, "POST", "campaigns", { name: "Shared", displayName: "DM" });
  const cid = made.body.id;
  await call(pl, "POST", "join", { code: made.body.code, displayName: "Pia" });
  assert.deepEqual((await call(pl, "GET", `campaigns/${cid}/shared`)).body, {}, "nothing shared yet");
  const journal = { quests: [{ title: "Find the bell", status: "Active" }],
    sourceRules: { edition: "2014", books: ["tob3", "tob3", "bad source"], homebrew: true, private: "Only for the DM" },
    handouts: [{ id: "letter", title: "A letter", notes: "Meet at the mill.", picture: "data:image/webp;base64,AAAA", url: "http://example.com", private: "Only for the DM" }] };
  assert.equal((await call(pl, "PUT", `campaigns/${cid}/shared/journal`, { data: journal })).status, 403, "players can't publish");
  assert.equal((await call(dm, "PUT", `campaigns/${cid}/shared/secrets`, { data: {} })).status, 404, "only the known kinds");
  assert.equal((await call(dm, "PUT", `campaigns/${cid}/shared/journal`, { data: journal })).status, 200);
  await call(dm, "PUT", `campaigns/${cid}/shared/turns`, { data: { round: 2, rows: [{ name: "Goblin", foe: true, cur: true, state: "Bloodied" }] } });
  const seen = (await call(pl, "GET", `campaigns/${cid}/shared`)).body;
  assert.equal(seen.journal.data.quests[0].title, "Find the bell");
  assert.deepEqual(seen.journal.data.sourceRules, { edition: "2014", books: ["tob3"], homebrew: true });
  assert.deepEqual(seen.journal.data.handouts, [{ id: "letter", title: "A letter", notes: "Meet at the mill.", picture: "data:image/webp;base64,AAAA" }]);
  assert.equal(seen.turns.data.round, 2);
  assert.equal((await call(out, "GET", `campaigns/${cid}/shared`)).status, 403, "outsiders see nothing");
  await call(dm, "DELETE", `campaigns/${cid}/shared/turns`);
  assert.equal((await call(pl, "GET", `campaigns/${cid}/shared`)).body.turns, undefined, "the fight ended");
  // rolls
  await call(pl, "POST", `campaigns/${cid}/characters`, { data: { id: "pc-pia", name: "Pia", hpCur: 9 } });
  await call(dm, "POST", `campaigns/${cid}/characters`, { data: { id: "pc-npc", name: "Guard", hpCur: 9 } });
  assert.equal((await call(pl, "POST", `campaigns/${cid}/rolls`, { characterId: "pc-pia", text: "Perception: 17" })).status, 201);
  assert.equal((await call(pl, "POST", `campaigns/${cid}/rolls`, { characterId: "pc-npc", text: "Stealth: 20" })).status, 403, "only for your own character");
  assert.equal((await call(pl, "POST", `campaigns/${cid}/rolls`, { characterId: "pc-pia", text: "  " })).status, 400);
  const feed = (await call(dm, "GET", `campaigns/${cid}/activity`)).body;
  assert.equal(feed[0].summary, "🎲 Perception: 17");
  assert.equal(feed[0].characterName, "Pia");
});

test("shared data is stored in its expected shape only, so no markup reaches players", async () => {
  const dm = { id: "u-xs-dm", email: "xsdm@example.com" };
  const cid = (await call(dm, "POST", "campaigns", { name: "XSS check", displayName: "DM" })).body.id;
  const bad = "<img src=x onerror=alert(1)>";
  const r = await call(dm, "PUT", `campaigns/${cid}/shared/turns`, { data: { name: "Fight", round: bad, evil: bad, rows: [{ name: "Goblin", foe: "yes", cur: 1, state: bad, hp: 7 }, "junk"] } });
  assert.equal(r.status, 200);
  const t = (await call(dm, "GET", `campaigns/${cid}/shared`)).body.turns.data;
  assert.equal(t.round, 0, "a round that isn't a number is stored as 0");
  assert.equal(t.evil, undefined, "unknown fields are dropped");
  assert.deepEqual(t.rows, [{ name: "Goblin", foe: true, cur: true, state: "" }], "rows keep only name, foe, cur and a known state; never HP");
  assert.equal((await call(dm, "PUT", `campaigns/${cid}/shared/turns`, { data: { name: "F", round: 3, rows: [] } })).status, 200);
  assert.equal((await call(dm, "GET", `campaigns/${cid}/shared`)).body.turns.data.round, 3);
  await call(dm, "PUT", `campaigns/${cid}/shared/journal`, { data: { name: "J", extra: bad, cal: { day: bad, season: "Spring", weather: "Rain" },
    quests: [{ id: "q", title: "Find it", status: bad, giver: "Rue", notes: "secret" }], sessions: [{ id: "s", title: "One", num: 1, date: "2026-11-10", summary: "Hi" }],
    lore: [{ id: "l", name: "Tower", type: bad, tags: ["a", 5], imgUrl: "javascript:alert(1)", desc: "Old", sections: [{ t: "H", x: "Y", dm: true }] }] } });
  const j = (await call(dm, "GET", `campaigns/${cid}/shared`)).body.journal.data;
  assert.equal(j.extra, undefined);
  assert.equal(j.cal.day, 0);
  assert.equal(j.quests[0].status, "Active", "an unknown quest status becomes Active");
  assert.equal(j.quests[0].notes, undefined, "quest notes never go to players");
  assert.equal(j.lore[0].type, "other");
  assert.equal(j.lore[0].imgUrl, undefined, "only https picture links");
  assert.deepEqual(j.lore[0].tags, ["a"]);
  assert.deepEqual(j.lore[0].sections, [{ t: "H", x: "Y" }]);
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

test("feature requests: anyone signed in sends them and sees their own; the owner sees all and sets the status", async () => {
  process.env.FORGE_OWNER_EMAILS = "Owner@Example.com, helper@example.com";
  const owner = { id: "u-own", email: "owner@example.com" }, rue = { id: "u-rq1", email: "rue@example.com", name: "Rue" }, sam = { id: "u-rq2", email: "sam@example.com" };
  const good = { title: "Fold the spell list", kind: "change", area: "spells", who: "both", problem: "The spell list is far too long to scroll.", idea: "Let each level fold away.", devices: ["phone", "laptop", "fridge"], edition: "both", often: "every-session" };
  assert.equal((await call(null, "POST", "requests", good)).status, 401, "signed out can't send");
  assert.equal((await call(owner, "GET", "me")).body.owner, true, "the owner setting matches emails without minding case");
  assert.equal((await call(rue, "GET", "me")).body.owner, false);
  // sending: fields are checked and trimmed; unknown choices fall back; a picture must be a small data: image
  const sent = await call(rue, "POST", "requests", { ...good, image: "data:image/jpeg;base64,AAAA", extra: "ignored", displayName: "Rue" });
  assert.equal(sent.status, 201);
  assert.deepEqual(sent.body.request.data.devices, ["phone", "laptop"]);
  assert.equal(sent.body.request.data.extra, undefined);
  assert.equal(sent.body.request.status, "new");
  assert.equal(sent.body.request.userEmail, undefined, "a requester isn't shown emails");
  assert.equal((await call(rue, "POST", "requests", { ...good, title: "" })).status, 400);
  assert.equal((await call(rue, "POST", "requests", { ...good, idea: "x" })).status, 400);
  assert.equal((await call(rue, "POST", "requests", { ...good, image: "javascript:alert(1)" })).status, 400);
  assert.equal((await call(rue, "POST", "requests", { ...good, image: "data:image/svg+xml;base64,AAAA" })).status, 400, "no SVG pictures");
  assert.equal((await call(rue, "POST", "requests", { ...good, image: "data:image/png;base64," + "A".repeat(800_000) })).status, 413);
  await call(sam, "POST", "requests", { ...good, title: "Sam's idea" });
  // who sees what
  const mine = await call(rue, "GET", "requests");
  assert.equal(mine.body.owner, false);
  assert.deepEqual(mine.body.requests.map(r => r.data.title), ["Fold the spell list"]);
  const all = await call(owner, "GET", "requests");
  assert.equal(all.body.owner, true);
  assert.equal(all.body.requests.length, 2);
  assert.ok(all.body.requests.some(r => r.userEmail === "rue@example.com" && r.userName === "Rue"));
  // only the owner sets the status and replies; the requester then sees them
  const id = sent.body.request.id;
  assert.equal((await call(rue, "PATCH", `requests/${id}`, { status: "done" })).status, 403);
  assert.equal((await call(owner, "PATCH", `requests/${id}`, { status: "maybe" })).status, 400);
  const set = await call(owner, "PATCH", `requests/${id}`, { status: "planned", reply: "Good idea, coming soon." });
  assert.equal(set.body.request.status, "planned");
  const seen = (await call(rue, "GET", "requests")).body.requests[0];
  assert.equal(seen.status, "planned"); assert.equal(seen.reply, "Good idea, coming soon.");
  // taking one back: your own, only while it's new; the owner can remove any
  assert.equal((await call(rue, "DELETE", `requests/${id}`)).status, 403, "not once it's been looked at");
  const samId = (await call(sam, "GET", "requests")).body.requests[0].id;
  assert.equal((await call(rue, "DELETE", `requests/${samId}`)).status, 403, "not someone else's");
  assert.equal((await call(sam, "DELETE", `requests/${samId}`)).status, 200);
  assert.equal((await call(owner, "DELETE", `requests/${id}`)).status, 200);
  assert.equal((await call(owner, "GET", "requests/not-a-uuid")).status, 404);
  // at most 20 a day each
  for (let i = 0; i < 20; i++) await call(sam, "POST", "requests", { ...good, title: "n" + i });
  assert.equal((await call(sam, "POST", "requests", good)).status, 429);
  // odd bodies get a 400, not a server error
  const any = (await call(owner, "GET", "requests")).body.requests[0];
  const req = new Request("https://forge.test/api/requests/" + any.id, { method: "PATCH", headers: { "content-type": "application/json" }, body: "null" });
  assert.equal((await handle(req, owner, pool)).status, 400);
  delete process.env.FORGE_OWNER_EMAILS;
});

test("chat: DM ↔ player both ways, and a party chat the DM never sees", async () => {
  const made = await call(DM, "POST", "campaigns", { name: "Chat Keep", displayName: "Matt" });
  const cid = made.body.id, code = made.body.code;
  await call(AVA, "POST", "join", { code, displayName: "Ava" });
  await call(BEN, "POST", "join", { code, displayName: "Ben" });
  const W = `campaigns/${cid}/whispers`;
  const get = u => call(u, "GET", W);

  assert.equal((await call(AVA, "POST", W, { to: "dm", body: "Can I check for traps?" })).status, 201);
  let dmView = (await get(DM)).body;
  const ask = dmView.find(w => w.body === "Can I check for traps?");
  assert.ok(ask);
  assert.equal(ask.thread, AVA.id); assert.equal(ask.mine, false); assert.equal(ask.read, false); assert.equal(ask.fromName, "Ava");

  assert.equal((await call(DM, "POST", W, { to: AVA.id, body: "Roll Investigation." })).status, 201);
  const avaDm = (await get(AVA)).body.filter(w => w.thread === "dm");
  assert.deepEqual(avaDm.map(w => [w.body, w.mine]), [["Roll Investigation.", false], ["Can I check for traps?", true]]);

  assert.equal((await call(AVA, "POST", W, { to: "party", body: "First watch?" })).status, 201);
  const benParty = (await get(BEN)).body.filter(w => w.thread === "party");
  assert.equal(benParty.length, 1);
  assert.equal(benParty[0].fromName, "Ava"); assert.equal(benParty[0].read, false); assert.equal(benParty[0].body, "First watch?");
  dmView = (await get(DM)).body;
  assert.ok(!dmView.some(w => w.thread === "party" || w.body === "First watch?" || w.to === "party"), "the DM never gets party rows");
  assert.ok(!(await get(BEN)).body.some(w => /traps|Investigation/.test(w.body)), "Ben can't read Ava's DM chat");

  assert.equal((await call(AVA, "POST", W, { to: BEN.id, body: "psst" })).status, 403);
  assert.equal((await call(AVA, "POST", W, { to: "party", body: "   " })).status, 400);
  assert.equal((await call(DM, "POST", W, { to: "party", body: "hello all" })).status, 400);
  assert.equal((await call(AVA, "POST", W, { to: "party", body: "x".repeat(2500) })).status, 201);
  assert.equal((await get(BEN)).body.find(w => w.thread === "party" && w.body.startsWith("xxx")).body.length, 2000);

  assert.equal((await call(BEN, "POST", `${W}/read`, { thread: "party" })).status, 200);
  const benAfter = (await get(BEN)).body.filter(w => w.thread === "party");
  assert.ok(benAfter.every(w => w.read), "Ben's party chat is read");
  assert.ok((await get(AVA)).body.filter(w => w.thread === "party").every(w => w.read), "your own party messages count as read");

  assert.equal((await call(DM, "POST", `${W}/read`, { thread: AVA.id })).status, 200);
  assert.equal((await get(DM)).body.find(w => w.body === "Can I check for traps?").read, true);
  assert.equal((await call(DM, "POST", `${W}/read`, { thread: "party" })).status, 403);

  assert.equal((await call(BEN, "POST", W, { to: "party", body: "I'll take it." })).status, 201);
  await call(DM, "DELETE", `campaigns/${cid}/members/${BEN.id}`);
  assert.equal((await get(BEN)).status, 403);
  assert.equal((await get(AVA)).body.find(w => w.body === "I'll take it.").fromName, "A former player");
});
