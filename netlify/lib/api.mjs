// The Forge's shared-campaign API. Kept free of Netlify globals so it can be tested
// against a plain Postgres: `db` only needs `query(text, params) -> { rows }`, and
// `user` is the signed-in Identity user ({ id, email, name }) or null.
import { describeChange } from "./diff.mjs";

const MAX_SHEET_BYTES = 300_000;
const MAX_WHISPER = 2000;
const MAX_HOMEBREW_BYTES = 50_000;
const MAX_HB_REQUESTS = 30;       // homebrew one player can have waiting for the DM
const HOMEBREW_KINDS = ["class", "subclass", "background", "feat", "species", "spell"];
const SHARED_IDS = ["journal", "turns"];
const MAX_SHARED_BYTES = 1_000_000;
const MAX_ROLL = 200;
const MAX_DOC_BYTES = 4_000_000;     // one saved Tracker campaign or list (a big MythWeaver campaign is about 1.4 MB)
const MAX_USER_BYTES = 40_000_000;   // everything one account keeps
const MERGE_WINDOW = "60 seconds";
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
// ---- feature requests (the Requests tab) ----
const REQ_KINDS = ["feature", "change", "bug"];
const REQ_AREAS = ["generate", "npc", "world", "monsters", "characters", "spells", "feats", "items", "map", "tv", "tracker", "homebrew", "party", "journal", "import", "accounts", "phone", "other"];
const REQ_WHO = ["players", "dm", "both"];
const REQ_EDITIONS = ["2014", "2024", "both", "none"];
const REQ_OFTEN = ["every-session", "sometimes", "rarely"];
const REQ_DEVICES = ["phone", "tablet", "laptop", "tv"];
const REQ_STATUS = ["new", "planned", "in-progress", "done", "declined"];
const MAX_REQ_IMAGE = 700_000;   // one screenshot, shrunk in the browser first (a data: URL)
const MAX_REQ_PER_DAY = 20;
// The app's owner: emails in the FORGE_OWNER_EMAILS setting (comma-separated), set in Netlify's environment variables.
const isOwner = user => !!(user && user.email) && String(process.env.FORGE_OWNER_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean).includes(String(user.email).toLowerCase());
const text = (s, max) => String(s ?? "").replace(/\r/g, "").trim().slice(0, max); // keeps line breaks, unlike clean()
function requestData(p) {
  if (!p || typeof p !== "object") throw new HttpError(400, "Expected a request");
  const pickOne = (v, list, dflt) => list.includes(v) ? v : dflt;
  const d = {
    title: clean(p.title, 120), kind: pickOne(p.kind, REQ_KINDS, "feature"), area: pickOne(p.area, REQ_AREAS, "other"),
    who: pickOne(p.who, REQ_WHO, "both"), problem: text(p.problem, 4000), idea: text(p.idea, 4000), steps: text(p.steps, 4000),
    example: text(p.example, 2000), rules: text(p.rules, 1000), edition: pickOne(p.edition, REQ_EDITIONS, "none"),
    often: pickOne(p.often, REQ_OFTEN, "sometimes"), devices: (Array.isArray(p.devices) ? p.devices : []).filter(v => REQ_DEVICES.includes(v)).slice(0, 4),
  };
  if (!d.title) throw new HttpError(400, "Give your request a short title");
  if (d.problem.length < 10) throw new HttpError(400, "Say what you're trying to do, or what's wrong");
  if (d.idea.length < 10) throw new HttpError(400, "Say how you'd like it to work");
  return d;
}
function requestImage(img) {
  if (img === undefined || img === null || img === "") return null;
  if (typeof img !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(img)) throw new HttpError(400, "The screenshot must be a picture");
  if (img.length > MAX_REQ_IMAGE) throw new HttpError(413, "The screenshot is too large");
  return img;
}
const reqRow = (r, owner) => ({ id: r.id, data: r.data, image: r.image || null, status: r.status, reply: r.reply, createdAt: r.created_at, updatedAt: r.updated_at,
  ...(owner ? { userName: r.user_name, userEmail: r.user_email } : {}) });

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
    sourceRules: ["2014", "2024"].includes(d.sourceRules?.edition) ? {
      edition: d.sourceRules.edition, homebrew: d.sourceRules.homebrew === true,
      books: Array.isArray(d.sourceRules.books) ? [...new Set(d.sourceRules.books.filter(x => typeof x === "string" && /^[a-z0-9-]{1,40}$/.test(x)))].slice(0, 100) : [],
    } : null,
    handouts: arr(d.handouts, 6).map(x => ({
      id: str(x.id, 64), title: str(x.title, 100), notes: str(x.notes, 4000),
      ...(typeof x.picture === "string" && x.picture.length <= 95000 && /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(x.picture) ? { picture: x.picture } : {}),
      ...(typeof x.url === "string" && x.url.length <= 500 && /^https:\/\/[^\s"'<>]+$/i.test(x.url) ? { url: x.url } : {}),
    })),
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
        user: { id: user.id, email: user.email, name: user.name }, owner: isOwner(user),
        campaigns: rows.map(r => ({ id: r.id, name: r.name, role: r.role, displayName: r.display_name, code: r.role === "dm" ? r.code : undefined })),
      });
    }

    // ---- feature requests: anyone signed in sends them and sees their own; the owner sees all and sets the status ----
    if (a === "requests") {
      const owner = isOwner(user), rid = cid;
      if (rid && !/^[0-9a-f-]{36}$/i.test(rid)) throw new HttpError(404, "Not found");
      if (!rid && m === "GET") {
        const { rows } = owner
          ? await db.query("SELECT * FROM feature_requests ORDER BY created_at DESC LIMIT 500")
          : await db.query("SELECT * FROM feature_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200", [user.id]);
        return json({ owner, requests: rows.map(r => ({ ...reqRow(r, owner), mine: r.user_id === user.id })) });
      }
      if (!rid && m === "POST") {
        const p = await body(req), data = requestData(p), image = requestImage(p.image);
        const { rows: n } = await db.query("SELECT count(*)::int AS n FROM feature_requests WHERE user_id = $1 AND created_at > now() - interval '1 day'", [user.id]);
        if (n[0].n >= MAX_REQ_PER_DAY) throw new HttpError(429, "That's a lot of requests for one day. Please try again tomorrow");
        const { rows } = await db.query(
          "INSERT INTO feature_requests (user_id, user_name, user_email, data, image) VALUES ($1, $2, $3, $4, $5) RETURNING *",
          [user.id, clean(p.displayName || user.name, 60), String(user.email || ""), JSON.stringify(data), image]);
        return json({ request: { ...reqRow(rows[0], owner), mine: true } }, 201);
      }
      if (rid && m === "PATCH") {
        if (!owner) throw new HttpError(403, "Only the app's owner can change a request's status");
        const p = await body(req);
        if (!p || typeof p !== "object") throw new HttpError(400, "Expected a change");
        if (p.status !== undefined && !REQ_STATUS.includes(p.status)) throw new HttpError(400, "Unknown status");
        const { rows } = await db.query(
          `UPDATE feature_requests SET status = COALESCE($2, status), reply = COALESCE($3, reply), updated_at = now() WHERE id = $1 RETURNING *`,
          [rid, p.status ?? null, p.reply === undefined ? null : text(p.reply, 2000)]);
        if (!rows.length) throw new HttpError(404, "That request no longer exists");
        return json({ request: { ...reqRow(rows[0], owner), mine: rows[0].user_id === user.id } });
      }
      if (rid && m === "DELETE") {
        const { rows } = await db.query("SELECT user_id, status FROM feature_requests WHERE id = $1", [rid]);
        if (!rows.length) throw new HttpError(404, "That request no longer exists");
        if (!owner && (rows[0].user_id !== user.id || rows[0].status !== "new")) throw new HttpError(403, "You can only take back your own requests that haven't been looked at yet");
        await db.query("DELETE FROM feature_requests WHERE id = $1", [rid]);
        return json({ ok: true });
      }
      throw new HttpError(404, "Not found");
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

    // ---- homebrew requests: a player suggests an entry; it reaches the homebrew only when the DM approves it ----
    // Players only ever read and change their own rows (user_id = their id); the DM reads all and approves or turns down.
    if (b === "hbrequests" && !id && m === "GET") {
      const { rows } = await db.query(
        `SELECT r.user_id, r.id, r.data, r.created_at, r.updated_at, mb.display_name
           FROM homebrew_requests r LEFT JOIN members mb ON mb.campaign_id = r.campaign_id AND mb.user_id = r.user_id
          WHERE r.campaign_id = $1 AND ($2 OR r.user_id = $3) ORDER BY r.updated_at`, [cid, isDM, user.id]);
      return json(rows.map(r => ({ id: r.id, userId: r.user_id, userName: r.display_name || "A player", data: r.data, createdAt: r.created_at, updatedAt: r.updated_at })));
    }
    if (b === "hbrequests" && id && !c && m === "PUT") {
      if (isDM) throw new HttpError(403, "As the DM, add homebrew straight to the campaign");
      const item = homebrewItem(id, (await body(req)).data);
      for (const k of ["book", "src", "pend", "rejected", "from"]) delete item[k]; // only the Forge itself sets these
      const { rows: n } = await db.query("SELECT count(*)::int AS n FROM homebrew_requests WHERE campaign_id = $1 AND user_id = $2 AND id <> $3", [cid, user.id, id]);
      if (n[0].n >= MAX_HB_REQUESTS) throw new HttpError(429, `You have ${MAX_HB_REQUESTS} entries waiting for your DM already`);
      await db.query(
        `INSERT INTO homebrew_requests (campaign_id, user_id, id, data) VALUES ($1, $2, $3, $4)
         ON CONFLICT (campaign_id, user_id, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [cid, user.id, id, item]);
      return json(item);
    }
    if (b === "hbrequests" && id && !c && m === "DELETE") {
      const from = isDM ? url.searchParams.get("user") : user.id;
      if (!from) throw new HttpError(400, "Say whose request to turn down");
      await db.query("DELETE FROM homebrew_requests WHERE campaign_id = $1 AND user_id = $2 AND id = $3", [cid, from, id]);
      return json({ ok: true });
    }
    if (b === "hbrequests" && id && c === "approve" && m === "POST") {
      dmOnly();
      const from = url.searchParams.get("user") || "";
      const { rows } = await db.query("SELECT data FROM homebrew_requests WHERE campaign_id = $1 AND user_id = $2 AND id = $3", [cid, from, id]);
      if (!rows.length) throw new HttpError(404, "That request is gone");
      const item = homebrewItem(id, rows[0].data);
      // into the homebrew first, so a failed save never loses the request
      await db.query(
        `INSERT INTO homebrew (campaign_id, id, data) VALUES ($1, $2, $3)
         ON CONFLICT (campaign_id, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [cid, id, item]);
      await db.query("DELETE FROM homebrew_requests WHERE campaign_id = $1 AND user_id = $2 AND id = $3", [cid, from, id]);
      return json(item);
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

    // ---- chat (whispers): DM <-> each player, and a players-only party chat ----
    // A party message is a row with to_user_id = 'party'. The DM is never sent one. A player only gets rows they
    // sent or received, plus the party's.
    if (b === "whispers" && !id && m === "GET") {
      const names = `LEFT JOIN members f ON f.campaign_id = w.campaign_id AND f.user_id = w.from_user_id
                     LEFT JOIN members t ON t.campaign_id = w.campaign_id AND t.user_id = w.to_user_id`;
      const cols = "w.*, f.display_name AS from_name, t.display_name AS to_name";
      let rows, partyRead = 0;
      if (isDM) {
        ({ rows } = await db.query(
          `SELECT ${cols} FROM whispers w ${names}
            WHERE w.campaign_id = $1 AND w.to_user_id <> 'party' AND (w.from_user_id = $2 OR w.to_user_id = $2)
            ORDER BY w.id DESC LIMIT 400`, [cid, user.id]));
      } else {
        const own = await db.query(
          `SELECT ${cols} FROM whispers w ${names}
            WHERE w.campaign_id = $1 AND w.to_user_id <> 'party' AND (w.from_user_id = $2 OR w.to_user_id = $2)
            ORDER BY w.id DESC LIMIT 200`, [cid, user.id]);
        const party = await db.query(
          `SELECT ${cols} FROM whispers w ${names}
            WHERE w.campaign_id = $1 AND w.to_user_id = 'party' ORDER BY w.id DESC LIMIT 200`, [cid]);
        const rd = await db.query(
          "SELECT last_read_id FROM chat_reads WHERE campaign_id = $1 AND user_id = $2 AND thread = 'party'", [cid, user.id]);
        partyRead = rd.rows.length ? Number(rd.rows[0].last_read_id) : 0;
        rows = own.rows.concat(party.rows).sort((x, y) => Number(y.id) - Number(x.id));
      }
      return json(rows.map(r => {
        const mine = r.from_user_id === user.id, party = r.to_user_id === "party";
        return {
          id: Number(r.id), thread: party ? "party" : isDM ? (mine ? r.to_user_id : r.from_user_id) : "dm",
          from: r.from_user_id, fromName: r.from_name || "A former player",
          to: r.to_user_id, toName: party ? "Party" : r.to_name, body: r.body, at: r.created_at, mine,
          read: mine || (party ? Number(r.id) <= partyRead : !!r.read_at),
        };
      }));
    }
    if (b === "whispers" && !id && m === "POST") {
      const p = await body(req);
      const want = String(p.to ?? "");
      let to;
      if (isDM) {
        const { rows } = await db.query(
          "SELECT user_id FROM members WHERE campaign_id = $1 AND user_id = $2 AND role = 'player'", [cid, want]);
        if (!rows.length) throw new HttpError(400, "Pick a player in this campaign");
        to = rows[0].user_id;
      } else if (want === "party") {
        to = "party";
      } else if (want === "dm") {
        const { rows } = await db.query("SELECT user_id FROM members WHERE campaign_id = $1 AND role = 'dm' LIMIT 1", [cid]);
        if (!rows.length) throw new HttpError(400, "This campaign has no DM");
        to = rows[0].user_id;
      } else throw new HttpError(403, "Send to your DM or the party");
      const text = String(p.body ?? "").trim().slice(0, MAX_WHISPER);
      if (!text) throw new HttpError(400, "Write a message first");
      const { rows } = await db.query(
        "INSERT INTO whispers (campaign_id, from_user_id, to_user_id, body) VALUES ($1, $2, $3, $4) RETURNING id, created_at",
        [cid, user.id, to, text]);
      return json({ id: Number(rows[0].id), at: rows[0].created_at }, 201);
    }
    if (b === "whispers" && id === "read" && m === "POST") {
      let p = {};
      try { p = await req.json(); } catch { /* old clients send no body: the DM thread */ }
      const thread = String((p && p.thread) ?? (isDM ? "" : "dm"));
      if (thread === "party") {
        if (isDM) throw new HttpError(403, "The party chat is for the players");
        await db.query(
          `INSERT INTO chat_reads (campaign_id, user_id, thread, last_read_id)
             SELECT $1, $2, 'party', COALESCE(MAX(id), 0) FROM whispers WHERE campaign_id = $1 AND to_user_id = 'party'
           ON CONFLICT (campaign_id, user_id, thread) DO UPDATE SET last_read_id = GREATEST(chat_reads.last_read_id, EXCLUDED.last_read_id)`,
          [cid, user.id]);
      } else if (isDM) {
        await db.query(
          "UPDATE whispers SET read_at = now() WHERE campaign_id = $1 AND to_user_id = $2 AND from_user_id = $3 AND read_at IS NULL",
          [cid, user.id, thread]);
      } else if (thread === "dm") {
        await db.query(
          "UPDATE whispers SET read_at = now() WHERE campaign_id = $1 AND to_user_id = $2 AND read_at IS NULL", [cid, user.id]);
      } else throw new HttpError(400, "Unknown conversation");
      return json({ ok: true });
    }

    throw new HttpError(404, "Not found");
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, ...(e.extra || {}) }, e.status);
    console.error(e);
    return json({ error: "Something went wrong on the server" }, 500);
  }
}
