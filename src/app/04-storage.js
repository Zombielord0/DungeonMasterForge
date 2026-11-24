/* 04-storage.js: Downloads (saveFile), Backup and restore, Store (where Tracker campaigns are saved), and Cloud
   (signed-in DMs: the Tracker, World, NPCs, custom items and My monsters saved to their account). */

/* ======================= Downloads ======================= */
let downloads = null;
async function saveFile(filename, data) {
  if (!downloads) { // a normal website: hand the file to the browser
    const blob = data instanceof Blob ? data : new Blob([data], { type: /\.json$/i.test(filename) ? "application/json" : "application/octet-stream" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000); return;
  }
  try { await downloads.save({ filename, data }); }
  catch (e) { if (e && e.code === "declined") return; toast("Download failed: " + ((e && e.message) || "unavailable")); }
}

/* ======================= Backup and restore (browser-only data) =======================
   A backup is {app:"dmforge-backup", v:2, made, data:{key: raw string}, images:{key: data URL}}: the keys in BACKUP_KEYS,
   plus the map and NPC pictures from the MAPIMG store (v1 backups have no images). Add new kinds of saved data to BACKUP_KEYS.
   Settings (offline mode, header, What's new) are left out on purpose. */
const BACKUP_KEYS = ["dmforge.pcs.v1", "dmforge.campaigns.v1", "dmforge.homebrew.v1", "dmforge.items.v1", "dmforge.mymonsters.v1", "dmforge.npclib.v1", "dmforge.world.v1", "dmforge.favspells", "dmforge.fog.v1", "dmforge.mapdraft.v1"];
const BACKUP_LAST = "dmforge.lastBackup";
function backupData() { const data = {}; BACKUP_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v !== null) data[k] = v; }); return data; }
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
async function backupPictures() { try { return await MAPIMG.all(); } catch { return []; } }
async function backupMake() {
  const images = {};
  for (const [k, b] of await backupPictures()) { try { images[k] = await blobToDataURL(b); } catch { } }
  return { app: "dmforge-backup", v: 2, made: new Date().toISOString(), data: backupData(), images };
}
const sizeText = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
function backupSummary(data, pics) {
  const n = (k, f) => { try { return f(JSON.parse(data[k] || "null")) || 0; } catch { return 0; } };
  const pcs = n("dmforge.pcs.v1", v => v && v.roster && v.roster.length), camps = n("dmforge.campaigns.v1", v => Array.isArray(v) && v.length);
  const plural = (x, w) => `${x} ${w}${x === 1 ? "" : "s"}`;
  return `${plural(pcs, "character")} · ${plural(camps, "campaign")}${pics ? ` · ${plural(pics.n, "picture")}${pics.size ? ` (${sizeText(pics.size)})` : ""}` : ""}`;
}
async function backupInfo() {
  const last = localStorage.getItem(BACKUP_LAST), d = last ? new Date(last) : null;
  const when = !d ? "never" : d.toDateString() === new Date().toDateString() ? "today" : d.toLocaleDateString();
  const pics = await backupPictures(), size = pics.reduce((t, [, b]) => t + ((b && b.size) || 0), 0);
  $("#backupInfo").textContent = `In this browser: ${backupSummary(backupData(), { n: pics.length, size })}. Last backup: ${when}.`;
}
function backupOpen() { backupInfo(); $("#backupModal").classList.add("open"); $("#backupDownload").focus(); }
function backupClose() { $("#backupModal").classList.remove("open"); $("#backupBtn").focus(); }
async function backupRestore(file) {
  let bk = null;
  try { bk = JSON.parse(await file.text()); } catch { /* not JSON */ }
  if (!bk || bk.app !== "dmforge-backup" || !bk.data || typeof bk.data !== "object" || Object.values(bk.data).some(v => typeof v !== "string")) {
    toast("That file isn't a Forge backup. Choose a file made with 💾 Backup."); return;
  }
  const images = bk.images && typeof bk.images === "object" ? Object.entries(bk.images).filter(([, v]) => typeof v === "string" && v.startsWith("data:image/")) : null;
  const made = bk.made ? new Date(bk.made).toLocaleString() : "an unknown date";
  backupClose();
  const pics = images ? { n: images.length } : null;
  if (!(await confirmBox("Restore backup?", `Replace everything saved in this browser with the backup from ${made} (${backupSummary(bk.data, pics)})? What's here now will be lost, so download a backup first if you might need it.${images ? "" : " This backup was made before backups held pictures, so the pictures here are kept."}`, "Replace"))) return;
  BACKUP_KEYS.forEach(k => { if (typeof bk.data[k] === "string") localStorage.setItem(k, bk.data[k]); else localStorage.removeItem(k); });
  if (images) { // pictures: replace them too
    toast("Restoring pictures…");
    try { await MAPIMG.clear(); for (const [k, url] of images) await MAPIMG.put(k, await (await fetch(url)).blob()); }
    catch { toast("Some pictures couldn't be restored"); await new Promise(r => setTimeout(r, 1500)); }
  }
  location.reload();
}
$("#backupBtn").addEventListener("click", backupOpen);
$("#backupClose").addEventListener("click", backupClose);
$("#backupModal").addEventListener("click", e => { if (e.target.id === "backupModal") backupClose(); });
$("#backupModal").addEventListener("keydown", e => { if (e.key === "Escape") backupClose(); });
$("#backupDownload").addEventListener("click", async () => {
  const t = new Date(), ymd = [t.getFullYear(), t.getMonth() + 1, t.getDate()].map(x => String(x).padStart(2, "0")).join("-");
  saveFile(`forge-backup-${ymd}.json`, JSON.stringify(await backupMake()));
  localStorage.setItem(BACKUP_LAST, new Date().toISOString()); backupInfo(); toast("Backup downloaded. Keep the file somewhere safe.");
});
$("#backupFile").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if (f) backupRestore(f); });

/* ======================= Storage ======================= */
const LS_KEY = "dmforge.campaigns.v1";
const Store = {
  mode: "local", col: null, cache: new Map(), timers: {}, inflight: {}, dirty: {}, readOnly: false,
  lsRead() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } },
  lsWrite() { try { localStorage.setItem(LS_KEY, JSON.stringify([...this.cache.values()])); return true; } catch { return false; } },
  async init() {
    let db = null, user = null;
    try {
      if (window.claude && typeof window.claude.use === "function") {
        const timeout = new Promise(r => setTimeout(() => r([null, null, null]), 10000));
        [db, user, downloads] = await Promise.race([Promise.all([claude.use("db"), claude.use("user"), claude.use("downloads")]), timeout]);
      }
    } catch { db = null; }
    let id = null; try { id = user ? await user.id() : null; } catch { id = null; }
    if (db && id) {
      try {
        this.col = db.collection("data/users/" + id);
        const snap = await Promise.race([this.col.get(), new Promise((_, j) => setTimeout(() => j(new Error("timeout")), 10000))]);
        snap.docs.forEach(d => { if (d.exists && d.id.startsWith("c-")) this.cache.set(d.id, JSON.parse(JSON.stringify(d.data()))); else if (d.exists && d.id === "pcs") pcRemote = JSON.parse(JSON.stringify(d.data())); else if (d.exists && d.id === "items") itemsRemote = JSON.parse(JSON.stringify(d.data())); });
        this.mode = "db";
        const local = this.lsRead().filter(c => !this.cache.has(c.id));
        for (const c of local) { this.cache.set(c.id, c); await this.write(c); }
        if (local.length) { try { localStorage.removeItem(LS_KEY); } catch { } toast(`Moved ${local.length} campaign(s) into your account`); }
      } catch (e) { this.col = null; this.mode = "local"; }
    }
    if (this.mode === "local") this.lsRead().forEach(c => this.cache.set(c.id, c));
    setBadge();
  },
  list() { return [...this.cache.values()].sort((a, b) => (b.updated || 0) - (a.updated || 0)); },
  get(id) { return this.cache.get(id); },
  save(c) {
    c.updated = Date.now(); this.cache.set(c.id, c);
    clearTimeout(this.timers[c.id]); this.timers[c.id] = setTimeout(() => this.flush(c.id), 600);
    setBadge("Saving…");
  },
  async flush(id) {
    if (this.inflight[id]) { this.dirty[id] = true; return; }
    this.inflight[id] = true;
    try { const c = this.cache.get(id); if (c) await this.write(c); setBadge(); }
    catch (e) {
      const code = e && e.code;
      if (code === "invalid_argument") { this.readOnly = true; toast("Couldn't save — you may only have view access to this page"); }
      else if (code === "quota_exceeded") toast("Storage is full — delete an old campaign or trim long notes");
      else if (code === "unavailable") { setTimeout(() => this.flush(id), 1500 + Math.random() * 1000); }
      else toast("Couldn't save just now");
      setBadge("Not saved");
    } finally {
      this.inflight[id] = false;
      if (this.dirty[id]) { this.dirty[id] = false; this.flush(id); }
    }
  },
  async write(c) {
    if (this.mode === "db") await this.col.doc(c.id).set(JSON.parse(JSON.stringify(c)));
    else if (this.mode === "cloud") { this.lsWrite(); Cloud.touch(c.id); } // this browser's copy first, then the account (a few seconds later)
    else if (!this.lsWrite()) throw { code: "local" };
  },
  async remove(id) {
    clearTimeout(this.timers[id]); this.cache.delete(id);
    try { if (this.mode === "db") await this.col.doc(id).delete(); else { this.lsWrite(); if (this.mode === "cloud") Cloud.remove(id); } } catch { toast("Couldn't delete just now"); }
  },
  reload() { this.cache.clear(); this.lsRead().forEach(c => c && c.id && this.cache.set(c.id, c)); }
};
function setBadge(state) {
  const b = $("#storeBadge");
  if (state) { b.textContent = state; return; }
  $("#backupBtn").hidden = Store.mode !== "local"; // signed in: it's all on the server already
  if (Store.mode === "db") { b.textContent = "✓ Saved to your account"; b.className = "badge ok"; b.title = "Campaigns are stored privately with your Claude account"; }
  else if (Store.mode === "cloud") {
    const n = Object.keys(Cloud.meta.dirty).length;
    b.textContent = n ? (Cloud.offline ? "Saved on this device · will upload" : "Saving to your account…") : "✓ Saved to your account";
    b.className = n ? "badge" : "badge ok";
    b.title = n ? "Saved in this browser; it goes to your account as soon as it can be reached" : "Your Campaign Tracker, World, NPCs, custom items and monsters are saved privately to your account";
  }
  else { b.textContent = "Saved in this browser only"; b.className = "badge"; b.title = "Use 💾 Backup to keep a copy somewhere safe"; }
}

/* ======================= Saved to your account (signed-in DMs) =======================
   Signed in as a DM (or with no campaign yet), the Campaign Tracker, World places, Your NPCs, custom items and My monsters
   are saved privately to the account (API: /api/me/docs), so they're on every device the DM signs in on. Players never see them.
   - This browser keeps a copy in the usual localStorage keys and saves there first; the account gets each change about
     2.5 seconds later (Cloud.touch), or as soon as it can be reached. Unsent changes are listed in SYNC_KEY, so a closed tab
     or a dropped connection catches up next time.
   - Docs: one per Tracker campaign (its id, "c-…"), plus "world", "npclib", "items" and "mymonsters" (CLOUD_LISTS).
   - The browser's own data (made without an account) is set aside in STASH_KEY while signed in, offered once to be added to
     the account, and put back on signing out, so it's never lost or mixed into someone else's account.
   - Two devices: a campaign changed on both asks which to keep; a list keeps the entries from both. */
const SYNC_KEY = "dmforge.sync.v1", STASH_KEY = "dmforge.stash.v1", STASH_OFFERED = "dmforge.stashOffered.";
const CLOUD_LISTS = {
  /* the world doc also carries the world map (W.atlas): a merge keeps the first copy's */
  world: { key: "dmforge.world.v1", items: v => (v && Array.isArray(v.places) ? v.places : []), make: (l, ...from) => { const a = from.map(v => v && v.atlas).find(Boolean); return a ? { places: l, atlas: a } : { places: l }; }, reload: () => worldLoad() },
  npclib: { key: "dmforge.npclib.v1", items: v => (Array.isArray(v) ? v : []), make: l => l, reload: () => { } },
  items: { key: "dmforge.items.v1", items: v => (v && Array.isArray(v.list) ? v.list : []), make: l => ({ list: l, updated: Date.now() }), reload: () => { IT.custom = []; IT.updated = 0; itRestore(); } },
  mymonsters: { key: "dmforge.mymonsters.v1", items: v => (Array.isArray(v) ? v : []), make: l => l, reload: () => { mbLoadLib(); bsCustomRefresh(); } },
};
const CLOUD_KEYS = [LS_KEY, ...Object.values(CLOUD_LISTS).map(d => d.key)];
const lsJSON = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
/* both lists' entries; for the same id, `win`'s copy */
const listUnion = (win, other) => { const ids = new Set(win.map(x => x && x.id)); return [...win, ...other.filter(x => x && !ids.has(x.id))]; };

const Cloud = {
  on: false, uid: null, api: null, offline: false, timers: {}, busy: {}, again: {}, retry: null,
  meta: { owner: null, v: {}, dirty: {}, gone: {} },
  readMeta() { const m = lsJSON(SYNC_KEY) || {}; return { owner: m.owner || null, v: m.v || {}, dirty: m.dirty || {}, gone: m.gone || {} }; },
  saveMeta() { try { localStorage.setItem(SYNC_KEY, JSON.stringify(this.meta)); } catch { } },
  local(id) { return id.startsWith("c-") ? Store.cache.get(id) : (lsJSON(CLOUD_LISTS[id].key) || CLOUD_LISTS[id].make([])); },
  setLocal(id, data) {
    if (id.startsWith("c-")) { if (data) Store.cache.set(id, data); else Store.cache.delete(id); return; }
    try { localStorage.setItem(CLOUD_LISTS[id].key, JSON.stringify(data)); } catch { toast("This browser's storage is full; your account still has everything"); }
  },
  /* after this browser's copy changed: redraw what's on screen */
  reloadAll() {
    Store.reload(); Object.values(CLOUD_LISTS).forEach(d => { try { d.reload(); } catch (e) { console.warn(e); } });
    if (activeId && !Store.get(activeId)) activeId = null;
    try { renderCampList(); route(); } catch (e) { console.warn(e); }
    setBadge();
  },

  /* Signed in (portal): load the account's data and switch this browser over to it. api(path, {method, body}) -> {ok, status, data} */
  async start(userId, api) {
    if (this.on && this.uid === userId && !this.offline) return;
    this.api = api;
    let r; try { r = await api("me/docs"); } catch { r = { ok: false, status: 0, data: {} }; }
    let meta = this.readMeta();
    if (!r.ok) {
      if (meta.owner === userId) { // this browser has this account's copy: keep working from it and upload later
        Object.assign(this, { on: true, uid: userId, offline: true, meta }); Store.mode = "cloud"; setBadge();
        clearTimeout(this.retry); this.retry = setTimeout(() => this.start(userId, api), 30000);
        return;
      }
      if (r.status !== 401) toast("Couldn't reach your account, so the Tracker is saving in this browser for now");
      return;
    }
    clearTimeout(this.retry);
    if (meta.owner !== userId) {
      // the browser's own data is set aside (put back on signing out); another account's leftover copy is dropped
      if (!meta.owner) this.stashAdd();
      CLOUD_KEYS.forEach(k => localStorage.removeItem(k));
      meta = { owner: userId, v: {}, dirty: {}, gone: {} };
    }
    this.meta = meta; Object.assign(this, { on: true, uid: userId, offline: false });
    Store.mode = "cloud"; Store.reload();

    // merge the account with this browser's copy
    const server = new Map(r.data.docs.map(d => [d.id, d])), deleted = new Set(r.data.deleted);
    for (const id of Object.keys(meta.gone)) { if (server.has(id)) this.remove(id); else delete meta.gone[id]; server.delete(id); }
    const ids = new Set([...server.keys(), ...Store.cache.keys(), ...Object.keys(CLOUD_LISTS)]);
    let copies = 0;
    for (const id of ids) {
      if (!id.startsWith("c-") && !CLOUD_LISTS[id]) continue;
      const S = server.get(id), L = id.startsWith("c-") ? Store.cache.get(id) : lsJSON(CLOUD_LISTS[id].key), dirty = !!meta.dirty[id];
      if (deleted.has(id) && !S) { if (L) this.setLocal(id, null); delete meta.v[id]; delete meta.dirty[id]; continue; }
      if (!S) { if (L && (id.startsWith("c-") || CLOUD_LISTS[id].items(L).length)) { meta.dirty[id] = true; delete meta.v[id]; } continue; }
      if (!L || !dirty || meta.v[id] === S.version) {
        if (!L || !dirty) { this.setLocal(id, S.data); delete meta.dirty[id]; }
        meta.v[id] = S.version; continue;
      }
      // changed here and on another device since this browser last saved
      meta.v[id] = S.version;
      if (id.startsWith("c-")) {
        const copy = { ...L, id: uid("c"), name: `${L.name || "Campaign"} (copy from this device)` };
        this.setLocal(id, S.data); this.setLocal(copy.id, copy); meta.dirty[copy.id] = true; delete meta.dirty[id]; copies++;
      } else { const D = CLOUD_LISTS[id]; this.setLocal(id, D.make(listUnion(D.items(L), D.items(S.data)), L, S.data)); }
    }
    Store.lsWrite(); this.saveMeta(); this.reloadAll();
    if (copies) toast(`${copies} campaign${copies > 1 ? "s were" : " was"} changed on another device too; this device's version was kept as a copy`);
    Object.keys(meta.dirty).forEach(id => this.push(id));
    await this.offerStash();
  },

  /* signing out: send what's left, then put the browser's own data back. Anything that couldn't be sent stays here
     (still this account's copy) and goes up next time this account signs in. */
  async stop() {
    if (!this.on && !this.readMeta().owner) return;
    if (this.on && !this.offline) await this.flushAll(5000);
    this.saveMeta();
    if (Object.keys(this.readMeta().dirty).length) toast("Some changes couldn't reach your account yet. They're kept here and upload when you next sign in.");
    this.release(false);
  },
  /* back to browser-only data. Without `force`, unsent changes keep this account's copy here until it signs in again. */
  release(force) {
    const meta = this.readMeta();
    if (!meta.owner) return;
    if (!force && Object.keys(meta.dirty).length) return;
    Object.values(this.timers).forEach(clearTimeout); clearTimeout(this.retry);
    CLOUD_KEYS.forEach(k => localStorage.removeItem(k));
    const stash = lsJSON(STASH_KEY) || {};
    for (const [k, raw] of Object.entries(stash)) { try { localStorage.setItem(k, raw); } catch { } }
    localStorage.removeItem(STASH_KEY); localStorage.removeItem(SYNC_KEY);
    Object.assign(this, { on: false, uid: null, offline: false, meta: { owner: null, v: {}, dirty: {}, gone: {} } });
    Store.mode = "local"; this.reloadAll();
  },
  /* set the browser's own data aside (added to anything already set aside) */
  stashAdd() {
    const stash = lsJSON(STASH_KEY) || {};
    for (const k of CLOUD_KEYS) {
      const raw = localStorage.getItem(k); if (raw == null) continue;
      if (stash[k] == null) { stash[k] = raw; continue; }
      try {
        const now = JSON.parse(raw), old = JSON.parse(stash[k]);
        const D = k === LS_KEY ? { items: v => v || [], make: l => l } : Object.values(CLOUD_LISTS).find(d => d.key === k);
        stash[k] = JSON.stringify(D.make(listUnion(D.items(old), D.items(now)), old, now));
      } catch { }
    }
    try { localStorage.setItem(STASH_KEY, JSON.stringify(stash)); } catch { toast("This browser is full, so its own campaigns couldn't be set aside"); }
  },
  /* once per account: add the browser's own data to the account (it also stays set aside for signing out) */
  async offerStash() {
    const stash = lsJSON(STASH_KEY); if (!stash || localStorage.getItem(STASH_OFFERED + this.uid)) return;
    const get = k => { try { return JSON.parse(stash[k] || "null"); } catch { return null; } };
    const camps = (get(LS_KEY) || []).filter(c => c && c.id), lists = Object.entries(CLOUD_LISTS).map(([id, D]) => [id, D.items(get(D.key))]);
    const count = { camps: camps.length, places: lists[0][1].length, npcs: lists[1][1].length, other: lists[2][1].length + lists[3][1].length };
    if (!count.camps && !count.places && !count.npcs && !count.other) return;
    localStorage.setItem(STASH_OFFERED + this.uid, "1");
    const what = [count.camps && `${count.camps} Tracker campaign${count.camps > 1 ? "s" : ""}`, count.places && `${count.places} World place${count.places > 1 ? "s" : ""}`,
      count.npcs && `${count.npcs} NPC${count.npcs > 1 ? "s" : ""}`, count.other && `${count.other} custom item${count.other > 1 ? "s" : ""} and monster${count.other > 1 ? "s" : ""}`].filter(Boolean).join(", ");
    const yes = await confirmBox("Add this browser's work to your account?",
      `This browser has ${what} saved without an account. Add them to your account, so they're on every device you sign in on? They also stay in this browser for when you're signed out.`, "Add them");
    if (!yes) return;
    for (const c of camps) if (!Store.get(c.id)) { Store.cache.set(c.id, c); this.meta.dirty[c.id] = true; }
    for (const [id, items] of lists) { if (!items.length) continue; const D = CLOUD_LISTS[id], here = this.local(id); this.setLocal(id, D.make(listUnion(D.items(here), items), here, get(D.key))); this.meta.dirty[id] = true; }
    Store.lsWrite(); this.saveMeta(); this.reloadAll();
    Object.keys(this.meta.dirty).forEach(id => this.push(id));
    toast(`Added ${what} to your account`);
  },

  /* this browser's copy changed: send it to the account shortly */
  touch(id) {
    if (!this.on) return;
    this.meta.dirty[id] = true; this.saveMeta(); setBadge();
    if (this.busy[id]) this.again[id] = true; // an upload is on its way with the older copy: send again after it, and keep this marked unsent
    clearTimeout(this.timers[id]); this.timers[id] = setTimeout(() => this.push(id), 2500);
  },
  async push(id) {
    clearTimeout(this.timers[id]);
    if (!this.on || this.offline) return;
    if (this.busy[id]) { this.again[id] = true; return; }
    const data = this.local(id);
    if (!data) { delete this.meta.dirty[id]; this.saveMeta(); return; }
    this.busy[id] = true;
    let r;
    try { r = await this.api("me/docs/" + id, { method: "PUT", body: { data, baseVersion: this.meta.v[id] || 0 } }); }
    catch { r = { ok: false, status: 0, data: {} }; }
    this.busy[id] = false;
    if (r.ok) {
      this.meta.v[id] = r.data.version;
      if (!this.again[id]) delete this.meta.dirty[id];
    } else if (r.status === 409 && r.data.current) await this.clash(id, r.data.current);
    else if (r.status === 413) toast(r.data.error || "Too large to save to your account");
    else if (r.status === 401 || r.status === 403) { /* signed out elsewhere: kept here until the next sign-in */ }
    else { this.timers[id] = setTimeout(() => this.push(id), 15000); } // offline or a server hiccup: try again
    this.saveMeta(); setBadge();
    if (this.again[id]) { this.again[id] = false; this.push(id); }
  },
  /* another device saved since this one loaded it */
  async clash(id, current) {
    this.meta.v[id] = current.version;
    if (!id.startsWith("c-")) { // lists: keep both devices' entries
      const D = CLOUD_LISTS[id], here = this.local(id); this.setLocal(id, D.make(listUnion(D.items(here), D.items(current.data)), here, current.data));
      try { D.reload(); } catch { }
      this.again[id] = true; return;
    }
    const mine = Store.get(id), name = (mine && mine.name) || (current.data && current.data.name) || "This campaign";
    const keep = await confirmBox(`“${name}” was changed on another device`,
      "Keep the version on this device and replace the other one? Cancel loads the other device's version here instead.", "Keep this device's");
    if (keep) { this.again[id] = true; return; }
    this.setLocal(id, current.data); Store.lsWrite(); delete this.meta.dirty[id];
    if (activeId === id && location.hash === "#tracker") renderTracker(); else renderCampList();
  },
  remove(id) {
    if (!this.on) return;
    clearTimeout(this.timers[id]); delete this.meta.dirty[id]; delete this.meta.v[id]; this.meta.gone[id] = true; this.saveMeta();
    if (this.offline) return;
    Promise.resolve(this.api("me/docs/" + id, { method: "DELETE" })).then(r => { if (r && r.ok) { delete this.meta.gone[id]; this.saveMeta(); } }).catch(() => { });
  },
  async flushAll(ms) {
    const ids = Object.keys(this.meta.dirty);
    await Promise.race([Promise.all(ids.map(id => this.push(id))), new Promise(r => setTimeout(r, ms))]);
  },
};
/* leaving the page or switching apps: send unsent changes now */
document.addEventListener("visibilitychange", () => { if (document.hidden && Cloud.on) Object.keys(Cloud.meta.dirty).forEach(id => Cloud.push(id)); });
