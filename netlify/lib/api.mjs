// The Forge's shared-campaign API. Kept free of Netlify globals so it can be tested
// against a plain Postgres: `db` only needs `query(text, params) -> { rows }`, and
// `user` is the signed-in Identity user ({ id, email, name }) or null.
import { describeChange } from "./diff.mjs";

const MAX_SHEET_BYTES = 300_000;
const MAX_WHISPER = 2000;
const MAX_HOMEBREW_BYTES = 50_000;
const HOMEBREW_KINDS = ["subclass", "background", "feat", "species", "spell"];
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
  if (JSON.stringify(data).length > MAX_HOMEBREW_BYTES) throw new HttpError(413, "This homebrew entry is too large to save");
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
    if (a === "me" && m === "GET") {
      const { rows } = await db.query(
        `SELECT k.id, k.name, k.code, m.role, m.display_name
           FROM members m JOIN campaigns k ON k.id = m.campaign_id
          WHERE m.user_id = $1 ORDER BY m.joined_at`, [user.id]);
      return json({
        user: { id: user.id, email: user.email, name: user.name },
        campaigns: rows.map(r => ({ id: r.id, name: r.name, role: r.role, displayName: r.display_name, code: r.role === "dm" ? r.code : undefined })),
      });
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
      await db.query(
        "INSERT INTO characters (campaign_id, id, owner_id, data, updated_by) VALUES ($1, $2, $3, $4, $3)",
        [cid, charId, user.id, data]);
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
      if (!p.force && Number(p.baseVersion) !== cur.version) {
        throw new HttpError(409, "Someone else changed this sheet", { current: charRow(cur) });
      }
      const { rows: [{ version }] } = await db.query(
        `UPDATE characters SET data = $3, version = version + 1, updated_at = now(), updated_by = $4
          WHERE campaign_id = $1 AND id = $2 RETURNING version`, [cid, id, data, user.id]);
      await logActivity(db, cid, id, user.id, cur.data, data);
      return json({ version });
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
