// The Forge's shared-campaign API. Kept free of Netlify globals so it can be tested
// against a plain Postgres: `db` only needs `query(text, params) -> { rows }`, and
// `user` is the signed-in Identity user ({ id, email, name }) or null.
import { describeChange } from "./diff.mjs";

const MAX_SHEET_BYTES = 300_000;
const MAX_WHISPER = 2000;
const MAX_HOMEBREW_BYTES = 50_000;
const HOMEBREW_KINDS = ["class", "subclass", "background", "feat", "species", "spell"];
const SHARED_IDS = ["journal", "turns"];
const MAX_SHARED_BYTES = 1_000_000;
const MAX_ROLL = 200;
const MAX_DOC_BYTES = 4_000_000;     // one saved Tracker campaign or list (a big MythWeaver campaign is about 1.4 MB)
const MAX_USER_BYTES = 40_000_000;   // everything one account keeps
const MERGE_WINDOW = "60 seconds";
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}
const json = (body, status = 200) => Response.json(body, { status });
const clean = (s, max) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function newCode() {
  const pick = () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}`;
}

async function body(req) {
  try { return await req.json(); } catch { throw new HttpError(400, "Expected a JSON body"); }
}

async function roleIn(db, cid, uid) {
  if (!/^[0-9a-f-]{36}$/i.test(cid)) throw new HttpError(404, "Campaign not found");
  const { rows } = await db.query("SELECT role FROM members WHERE campaign_id = $1 AND user_id = $2", [cid, uid]);
  if (!rows.length) throw new HttpError(403, "You're not in this campaign");
  return rows[0].role;
}

function charRow(r) {
  return {
    id: r.id, ownerId: r.owner_id, ownerName: r.owner_name, data: r.data, version: r.version,
    updatedAt: r.updated_at, updatedByName: r.updated_by_name,
  };
}

async function logActivity(db, cid, charId, actorId, before, after) {
  // Fold rapid edits by the same person to the same sheet into one line, as long
  // as nobody else changed that sheet in between.
  const { rows } = await db.query(
    `SELECT id, before, actor_id, updated_at > now() - interval '${MERGE_WINDOW}' AS recent
       FROM activity WHERE campaign_id = $1 AND character_id = $2
      ORDER BY updated_at DESC, id DESC LIMIT 1`, [cid, charId]);
  const last = rows[0];
  if (last && last.recent && last.actor_id === actorId && last.before && before && after) {
    const summary = describeChange(last.before, after);
    if (summary) await db.query("UPDATE activity SET summary = $1, updated_at = now() WHERE id = $2", [summary, last.id]);
    else await db.query("DELETE FROM activity WHERE id = $1", [last.id]);
    return;
  }
  const summary = describeChange(before, after);
  if (!summary) return;
  await db.query(
    "INSERT INTO activity (campaign_id, character_id, actor_id, summary, before) VALUES ($1, $2, $3, $4, $5)",
    [cid, charId, actorId, summary, before && after ? before : null]);
}

const SELECT_CHAR = `
  SELECT c.*, o.display_name AS owner_name, u.display_name AS updated_by_name
    FROM characters c
    LEFT JOIN members o ON o.campaign_id = c.campaign_id AND o.user_id = c.owner_id
    LEFT JOIN members u ON u.campaign_id = c.campaign_id AND u.user_id = c.updated_by`;

async function getChar(db, cid, id) {
  const { rows } = await db.query(`${SELECT_CHAR} WHERE c.campaign_id = $1 AND c.id = $2`, [cid, id]);
  return rows[0] || null;
}

/* What the DM shares with players, rebuilt field by field: only the expected fields, as plain strings, numbers and booleans.
   Players' browsers draw these, so nothing else (and never quest notes or DM-only sections) is passed on. */
const str = (v, n) => typeof v === "string" ? v.slice(0, n) : typeof v === "number" ? String(v).slice(0, n) : "";
const num = v => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(99999, Math.floor(v))) : 0);
const arr = (v, n) => (Array.isArray(v) ? v.slice(0, n).filter(x => x && typeof x === "object" && !Array.isArray(x)) : []);
function sharedClean(id, d) {
  if (id === "turns") return {
    name: str(d.name, 120), round: num(d.round),
    rows: arr(d.rows, 80).map(r => ({ name: str(r.name, 80), foe: !!r.foe, cur: !!r.cur, state: ["Bloodied", "Down"].includes(r.state) ? r.state : "" })),
  };
  const cal = d.cal && typeof d.cal === "object" ? { day: num(d.cal.day), season: str(d.cal.season, 20), weather: str(d.cal.weather, 300) } : null;
  return {
    name: str(d.name, 120), cal,
    quests: arr(d.quests, 300).map(q => ({ id: str(q.id, 64), title: str(q.title, 200), status: ["Active", "On hold", "Completed", "Failed"].includes(q.status) ? q.status : "Active", giver: str(q.giver, 120) })),
    sessions: arr(d.sessions, 300).map(x => ({ id: str(x.id, 64), title: str(x.title, 200), num: str(x.num, 10), date: str(x.date, 20), summary: str(x.summary, 20000) })),
    lore: arr(d.lore, 500).map(x => ({
      id: str(x.id, 64), name: str(x.name, 120), type: ["place", "item", "monster", "encounter", "other"].includes(x.type) ? x.type : "other",
      tags: (Array.isArray(x.tags) ? x.tags : []).filter(t => typeof t === "string").slice(0, 30).map(t => t.slice(0, 60)),
      ...(typeof x.imgUrl === "string" && /^https:\/\/[^\s"'<>]+$/i.test(x.imgUrl) && x.imgUrl.length <= 500 ? { imgUrl: x.imgUrl } : {}),
      desc: str(x.desc, 8000), sections: arr(x.sections, 40).map(z => ({ t: str(z.t, 120), x: str(z.x, 12000) })),
    })),
  };
}

function sheet(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400, "Character data is missing");
  if (JSON.stringify(data).length > MAX_SHEET_BYTES) throw new HttpError(413, "This character sheet is too large to save");
  return data;
}

function homebrewItem(id, data) {
  if (!/^[\w-]{1,64}$/.test(id)) throw new HttpError(400, "Bad homebrew id");
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400, "Homebrew data is missing");
  if (!HOMEBREW_KINDS.includes(data.kind)) throw new HttpError(400, "Unknown kind of homebrew");
  if (!clean(data.name, 80)) throw new HttpError(400, "Give it a name");
  if (JSON.stringify(data).length > (data.kind === "class" ? MAX_HOMEBREW_BYTES * 6 : MAX_HOMEBREW_BYTES)) throw new HttpError(413, "This homebrew entry is too large to save"); // a class carries 20 levels of features
  return { ...data, id };
}

export async function handle(req, user, db) {
  try {
    if (!user) throw new HttpError(401, "Please sign in");
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "").split("/").filter(Boolean);
    const m = req.method;
    const [a, cid, b, id, c] = path;

    // ---- who am I, which campaigns ----
    if (a === "me" && !cid && m === "GET") {
      const { rows } = await db.query(
        `SELECT k.id, k.name, k.code, m.role, m.display_name
           FROM members m JOIN campaigns k ON k.id = m.campaign_id
          WHERE m.user_id = $1 ORDER BY m.joined_at`, [user.id]);
      return json({
        user: { id: user.id, email: user.email, name: user.name },
        campaigns: rows.map(r => ({ id: r.id, name: r.name, role: r.role, displayName: r.display_name, code: r.role === "dm" ? r.code : undefined })),
      });
    }

    // ---- this account's own saved data (private: the Tracker, World, NPCs, custom items, My monsters) ----
    if (a === "me" && cid === "docs") {
      const docId = b;
      if (!docId && m === "GET") {
        const { rows } = await db.query(
          "SELECT id, data, version, updated_at, deleted_at FROM user_docs WHERE user_id = $1 ORDER BY id", [user.id]);
        return json({
          docs: rows.filter(r => !r.deleted_at).map(r => ({ id: r.id, data: r.data, version: r.version, updatedAt: r.updated_at })),
          deleted: rows.filter(r => r.deleted_at).map(r => r.id),
        });
      }
      if (!docId || id) throw new HttpError(404, "Not found");
      if (!/^[\w.-]{1,80}$/.test(docId)) throw new HttpError(400, "Bad id");
      const { rows: [cur] } = await db.query(
        "SELECT data, version, updated_at, deleted_at FROM user_docs WHERE user_id = $1 AND id = $2", [user.id, docId]);
      const live = cur && !cur.deleted_at;
      if (m === "DELETE") {
        if (live) await db.query(
          "UPDATE user_docs SET data = NULL, deleted_at = now(), updated_at = now(), version = version + 1 WHERE user_id = $1 AND id = $2",
          [user.id, docId]);
        return json({ ok: true });
      }
      if (m !== "PUT") throw new HttpError(404, "Not found");
      const p = await body(req);
      if (!p.data || typeof p.data !== "object") throw new HttpError(400, "Nothing to save");
      const size = JSON.stringify(p.data).length;
      if (size > MAX_DOC_BYTES) throw new HttpError(413, "This is too large to save to your account (over 4 MB). Trim long notes or split the campaign.");
      const { rows: [{ total }] } = await db.query(
        "SELECT COALESCE(SUM(octet_length(data::text)), 0)::bigint AS total FROM user_docs WHERE user_id = $1 AND id <> $2 AND deleted_at IS NULL",
        [user.id, docId]);
      if (Number(total) + size > MAX_USER_BYTES) throw new HttpError(413, "Your account's storage is full (40 MB). Delete an old campaign to make room.");
      // Save only if nobody saved since this copy was loaded (or the caller chose to overwrite). The check is part of the
      // same statement, so two devices saving at the same moment can't both pass it.
      const text = JSON.stringify(p.data); // as text: pg would send a JS array as a Postgres array
      const { rows } = cur
        ? await db.query(
          `UPDATE user_docs SET data = $3::jsonb, version = version + 1, updated_at = now(), deleted_at = NULL
            WHERE user_id = $1 AND id = $2 AND ($4 OR deleted_at IS NOT NULL OR version = $5) RETURNING version`,
          [user.id, docId, text, !!p.force, Number.isInteger(Number(p.baseVersion)) ? Number(p.baseVersion) : 0])
        : await db.query(
          `INSERT INTO user_docs (user_id, id, data) VALUES ($1, $2, $3::jsonb) ON CONFLICT (user_id, id) DO NOTHING RETURNING version`,
          [user.id, docId, text]);
      if (!rows.length) { // another device got there first: hand back its version
        const { rows: [now] } = await db.query("SELECT data, version, updated_at FROM user_docs WHERE user_id = $1 AND id = $2", [user.id, docId]);
        throw new HttpError(409, "Changed on another device", { current: { data: now.data, version: now.version, updatedAt: now.updated_at } });
      }
      return json({ version: rows[0].version });
    }

    if (a === "campaigns" && !cid && m === "POST") {
      const p = await body(req);
      const name = clean(p.name, 80) || "New Campaign";
      const displayName = clean(p.displayName, 40) || "DM";
      for (let tries = 0; tries < 8; tries++) {
        try {
          const { rows } = await db.query(
            "INSERT INTO campaigns (name, code, dm_user_id) VALUES ($1, $2, $3) RETURNING id, name, code",
            [name, newCode(), user.id]);
          await db.query(
            "INSERT INTO members (campaign_id, user_id, email, display_name, role) VALUES ($1, $2, $3, $4, 'dm')",
            [rows[0].id, user.id, user.email, displayName]);
          return json({ ...rows[0], role: "dm", displayName }, 201);
        } catch (e) { if (e.code !== "23505") throw e; } // code collision, try another
      }
      throw new HttpError(500, "Couldn't create a join code, please try again");
    }

    if (a === "join" && m === "POST") {
      const p = await body(req);
      const code = clean(p.code, 12).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const displayName = clean(p.displayName, 40);
      if (!displayName) throw new HttpError(400, "Enter the name the DM should see");
      const { rows } = await db.query(
        "SELECT id, name FROM campaigns WHERE replace(code, '-', '') = $1", [code]);
      if (!rows.length) throw new HttpError(404, "No campaign has that code. Check it with your DM.");
      const k = rows[0];
      const { rows: ex } = await db.query("SELECT role FROM members WHERE campaign_id = $1 AND user_id = $2", [k.id, user.id]);
      if (!ex.length) {
        await db.query(
          "INSERT INTO members (campaign_id, user_id, email, display_name, role) VALUES ($1, $2, $3, $4, 'player')",
          [k.id, user.id, user.email, displayName]);
      }
      return json({ id: k.id, name: k.name, role: ex.length ? ex[0].role : "player", displayName });
    }

    if (a !== "campaigns" || !cid) throw new HttpError(404, "Not found");
    const role = await roleIn(db, cid, user.id);
    const isDM = role === "dm";
    const dmOnly = () => { if (!isDM) throw new HttpError(403, "Only the DM can do that"); };

    // ---- the campaign itself: the DM can rename it ----
    if (!b && m === "PUT") {
      dmOnly();
      const p = await body(req), name = clean(p.name, 80);
      if (!name) throw new HttpError(400, "Give the campaign a name");
      await db.query("UPDATE campaigns SET name = $2 WHERE id = $1", [cid, name]);
      return json({ id: cid, name });
    }

    // ---- members ----
    if (b === "members" && !id && m === "GET") {
      dmOnly();
      const { rows } = await db.query(
        "SELECT user_id, display_name, email, role, joined_at FROM members WHERE campaign_id = $1 ORDER BY role, display_name", [cid]);
      return json(rows.map(r => ({ id: r.user_id, name: r.display_name, email: r.email, role: r.role, joinedAt: r.joined_at })));
    }
    if (b === "members" && id && m === "DELETE") {
      dmOnly();
      if (id === user.id) throw new HttpError(400, "You can't remove yourself as DM");
      await db.query("DELETE FROM members WHERE campaign_id = $1 AND user_id = $2 AND role = 'player'", [cid, id]);
      return json({ ok: true });
    }

    // ---- characters ----
    if (b === "characters" && !id && m === "GET") {
      const since = url.searchParams.get("since");
      const params = [cid];
      let where = "c.campaign_id = $1";
      if (!isDM) { params.push(user.id); where += ` AND c.owner_id = $${params.length}`; }
      // a small overlap so a save landing at the same instant is never missed
      if (since) { params.push(since); where += ` AND c.updated_at > $${params.length}::timestamptz - interval '3 seconds'`; }
      else where += " AND c.deleted_at IS NULL";
      const [{ rows }, { rows: [{ now }] }] = await Promise.all([
        db.query(`${SELECT_CHAR} WHERE ${where} ORDER BY c.updated_at`, params),
        db.query("SELECT now() AS now"),
      ]);
      return json({
        now,
        characters: rows.filter(r => !r.deleted_at).map(charRow),
        deleted: rows.filter(r => r.deleted_at).map(r => r.id),
      });
    }

    if (b === "characters" && !id && m === "POST") {
      const p = await body(req);
      const data = sheet(p.data);
      const charId = clean(p.id || data.id, 64);
      if (!charId) throw new HttpError(400, "Character id is missing");
      const existing = await getChar(db, cid, charId);
      if (existing && !existing.deleted_at) throw new HttpError(409, "That character already exists", { current: charRow(existing) });
      if (existing) { // re-creating a deleted id: only its owner or the DM
        if (existing.owner_id !== user.id && !isDM) throw new HttpError(403, "That character belongs to someone else");
        await db.query("DELETE FROM characters WHERE campaign_id = $1 AND id = $2", [cid, charId]);
      }
      try {
        await db.query(
          "INSERT INTO characters (campaign_id, id, owner_id, data, updated_by) VALUES ($1, $2, $3, $4, $3)",
          [cid, charId, user.id, data]);
      } catch (e) { // made at the same moment by another save: hand that one back, as above
        if (e.code !== "23505") throw e;
        const now = await getChar(db, cid, charId);
        throw new HttpError(409, "That character already exists", now ? { current: charRow(now) } : undefined);
      }
      await logActivity(db, cid, charId, user.id, null, data);
      return json(charRow(await getChar(db, cid, charId)), 201);
    }

    if (b === "characters" && id && !c && (m === "PUT" || m === "DELETE")) {
      const cur = await getChar(db, cid, id);
      if (!cur || cur.deleted_at) throw new HttpError(404, "That character no longer exists");
      if (cur.owner_id !== user.id && !isDM) throw new HttpError(403, "That character belongs to someone else");

      if (m === "DELETE") {
        await db.query(
          "UPDATE characters SET deleted_at = now(), updated_at = now(), updated_by = $3, version = version + 1 WHERE campaign_id = $1 AND id = $2",
          [cid, id, user.id]);
        await logActivity(db, cid, id, user.id, cur.data, null);
        return json({ ok: true });
      }

      const p = await body(req);
      const data = sheet(p.data);
      // Someone else saved since this copy was loaded: hand back their version
      // unless the caller has already seen the warning and chosen to overwrite.
      // "Keep mine" in the clash dialog sends force without a baseVersion; NaN must never reach the integer column
      const base = Number.isInteger(Number(p.baseVersion)) ? Number(p.baseVersion) : -1;
      if (!p.force && base !== cur.version) {
        throw new HttpError(409, "Someone else changed this sheet", { current: charRow(cur) });
      }
      // The version check is repeated inside the UPDATE, so two saves at the same moment can't both pass it:
      // the second finds the version already moved on and is handed the winning sheet.
      const { rows } = await db.query(
        `UPDATE characters SET data = $3, version = version + 1, updated_at = now(), updated_by = $4
          WHERE campaign_id = $1 AND id = $2 AND deleted_at IS NULL AND ($5 OR version = $6) RETURNING version`,
        [cid, id, data, user.id, !!p.force, base]);
      if (!rows.length) {
        const now = await getChar(db, cid, id);
        if (!now || now.deleted_at) throw new HttpError(404, "That character no longer exists");
        throw new HttpError(409, "Someone else changed this sheet", { current: charRow(now) });
      }
      await logActivity(db, cid, id, user.id, cur.data, data);
      return json({ version: rows[0].version });
    }

    // ---- homebrew: everyone in the campaign reads it, only the DM changes it ----
    if (b === "homebrew" && !id && m === "GET") {
      const { rows } = await db.query("SELECT data FROM homebrew WHERE campaign_id = $1 ORDER BY updated_at", [cid]);
      return json(rows.map(r => r.data));
    }
    if (b === "homebrew" && id && !c && m === "PUT") {
      dmOnly();
      const item = homebrewItem(id, (await body(req)).data);
      await db.query(
        `INSERT INTO homebrew (campaign_id, id, data) VALUES ($1, $2, $3)
         ON CONFLICT (campaign_id, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [cid, id, item]);
      return json(item);
    }
    if (b === "homebrew" && id && !c && m === "DELETE") {
      dmOnly();
      await db.query("DELETE FROM homebrew WHERE campaign_id = $1 AND id = $2", [cid, id]);
      return json({ ok: true });
    }

    // ---- what the DM shows the campaign: the players' Journal and the live turn order ----
    if (b === "shared" && !id && m === "GET") {
      const { rows } = await db.query("SELECT id, data, updated_at FROM campaign_shared WHERE campaign_id = $1", [cid]);
      return json(Object.fromEntries(rows.map(r => [r.id, { data: r.data, updatedAt: r.updated_at }])));
    }
    if (b === "shared" && id && !c && (m === "PUT" || m === "DELETE")) {
      dmOnly();
      if (!SHARED_IDS.includes(id)) throw new HttpError(404, "Not found");
      if (m === "DELETE") { await db.query("DELETE FROM campaign_shared WHERE campaign_id = $1 AND id = $2", [cid, id]); return json({ ok: true }); }
      const p = await body(req);
      if (!p.data || typeof p.data !== "object" || Array.isArray(p.data)) throw new HttpError(400, "Nothing to share");
      if (JSON.stringify(p.data).length > MAX_SHARED_BYTES) throw new HttpError(413, "Too much to share with the players at once");
      const text = JSON.stringify(sharedClean(id, p.data));
      await db.query(
        `INSERT INTO campaign_shared (campaign_id, id, data) VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (campaign_id, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [cid, id, text]);
      return json({ ok: true });
    }

    // ---- a dice roll a player shares with the DM: a line in the activity feed ----
    if (b === "rolls" && !id && m === "POST") {
      const p = await body(req);
      const text = clean(p.text, MAX_ROLL);
      if (!text) throw new HttpError(400, "Nothing rolled");
      const ch = await getChar(db, cid, clean(p.characterId, 64));
      if (!ch || ch.deleted_at) throw new HttpError(404, "That character no longer exists");
      if (ch.owner_id !== user.id && !isDM) throw new HttpError(403, "That character belongs to someone else");
      await db.query(
        "INSERT INTO activity (campaign_id, character_id, actor_id, summary) VALUES ($1, $2, $3, $4)",
        [cid, ch.id, user.id, "🎲 " + text]);
      return json({ ok: true }, 201);
    }

    // ---- activity feed (DM) ----
    if (b === "activity" && m === "GET") {
      dmOnly();
      const { rows } = await db.query(
        `SELECT a.id, a.character_id, a.summary, a.updated_at, m.display_name AS actor_name, m.role AS actor_role,
                COALESCE(ch.data->>'name', a.before->>'name') AS character_name
           FROM activity a
           LEFT JOIN members m ON m.campaign_id = a.campaign_id AND m.user_id = a.actor_id
           LEFT JOIN characters ch ON ch.campaign_id = a.campaign_id AND ch.id = a.character_id
          WHERE a.campaign_id = $1 ORDER BY a.updated_at DESC LIMIT 60`, [cid]);
      return json(rows.map(r => ({
        id: r.id, characterId: r.character_id, characterName: r.character_name || "A character",
        actor: r.actor_name || "Someone", byDM: r.actor_role === "dm", summary: r.summary, at: r.updated_at,
      })));
    }

    // ---- whispers ----
    if (b === "whispers" && !id && m === "GET") {
      const { rows } = isDM
        ? await db.query(
          `SELECT w.*, m.display_name AS to_name FROM whispers w
             LEFT JOIN members m ON m.campaign_id = w.campaign_id AND m.user_id = w.to_user_id
            WHERE w.campaign_id = $1 ORDER BY w.created_at DESC LIMIT 100`, [cid])
        : await db.query(
          "SELECT * FROM whispers WHERE campaign_id = $1 AND to_user_id = $2 ORDER BY created_at DESC LIMIT 100", [cid, user.id]);
      return json(rows.map(r => ({ id: r.id, to: r.to_user_id, toName: r.to_name, body: r.body, at: r.created_at, read: !!r.read_at })));
    }
    if (b === "whispers" && !id && m === "POST") {
      dmOnly();
      const p = await body(req);
      const text = String(p.body ?? "").trim().slice(0, MAX_WHISPER);
      if (!text) throw new HttpError(400, "Write a message first");
      const { rows: to } = await db.query(
        "SELECT user_id FROM members WHERE campaign_id = $1 AND user_id = $2 AND role = 'player'", [cid, String(p.to ?? "")]);
      if (!to.length) throw new HttpError(400, "Pick a player in this campaign");
      const { rows } = await db.query(
        "INSERT INTO whispers (campaign_id, from_user_id, to_user_id, body) VALUES ($1, $2, $3, $4) RETURNING id, created_at",
        [cid, user.id, to[0].user_id, text]);
      return json({ id: rows[0].id, at: rows[0].created_at }, 201);
    }
    if (b === "whispers" && id === "read" && m === "POST") {
      await db.query(
        "UPDATE whispers SET read_at = now() WHERE campaign_id = $1 AND to_user_id = $2 AND read_at IS NULL", [cid, user.id]);
      return json({ ok: true });
    }

    throw new HttpError(404, "Not found");
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, ...(e.extra || {}) }, e.status);
    console.error(e);
    return json({ error: "Something went wrong on the server" }, 500);
  }
}
