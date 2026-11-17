/* 04-storage.js: Downloads (saveFile), Backup and restore, and Store (where campaigns are saved). */

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
   A backup is {app:"dmforge-backup", v:1, made, data:{key: raw string}} for the keys in BACKUP_KEYS.
   Add new kinds of saved data to BACKUP_KEYS. Settings (offline mode, header, What's new) are left out on purpose. */
const BACKUP_KEYS = ["dmforge.pcs.v1", "dmforge.campaigns.v1", "dmforge.homebrew.v1", "dmforge.items.v1", "dmforge.mymonsters.v1", "dmforge.npclib.v1", "dmforge.world.v1", "dmforge.favspells", "dmforge.fog.v1"];
const BACKUP_LAST = "dmforge.lastBackup";
function backupMake() {
  const data = {}; BACKUP_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v !== null) data[k] = v; });
  return { app: "dmforge-backup", v: 1, made: new Date().toISOString(), data };
}
function backupSummary(data) {
  const n = (k, f) => { try { return f(JSON.parse(data[k] || "null")) || 0; } catch { return 0; } };
  const pcs = n("dmforge.pcs.v1", v => v && v.roster && v.roster.length), camps = n("dmforge.campaigns.v1", v => Array.isArray(v) && v.length);
  const plural = (x, w) => `${x} ${w}${x === 1 ? "" : "s"}`;
  return `${plural(pcs, "character")} · ${plural(camps, "campaign")}`;
}
function backupInfo() {
  const last = localStorage.getItem(BACKUP_LAST), d = last ? new Date(last) : null;
  const when = !d ? "never" : d.toDateString() === new Date().toDateString() ? "today" : d.toLocaleDateString();
  $("#backupInfo").textContent = `In this browser: ${backupSummary(backupMake().data)}. Last backup: ${when}.`;
}
function backupOpen() { backupInfo(); $("#backupModal").classList.add("open"); $("#backupDownload").focus(); }
function backupClose() { $("#backupModal").classList.remove("open"); $("#backupBtn").focus(); }
async function backupRestore(file) {
  let bk = null;
  try { bk = JSON.parse(await file.text()); } catch { /* not JSON */ }
  if (!bk || bk.app !== "dmforge-backup" || !bk.data || typeof bk.data !== "object" || Object.values(bk.data).some(v => typeof v !== "string")) {
    toast("That file isn't a Forge backup. Choose a file made with 💾 Backup."); return;
  }
  const made = bk.made ? new Date(bk.made).toLocaleString() : "an unknown date";
  backupClose();
  if (!(await confirmBox("Restore backup?", `Replace everything saved in this browser with the backup from ${made} (${backupSummary(bk.data)})? What's here now will be lost, so download a backup first if you might need it.`, "Replace"))) return;
  BACKUP_KEYS.forEach(k => { if (typeof bk.data[k] === "string") localStorage.setItem(k, bk.data[k]); else localStorage.removeItem(k); });
  location.reload();
}
$("#backupBtn").addEventListener("click", backupOpen);
$("#backupClose").addEventListener("click", backupClose);
$("#backupModal").addEventListener("click", e => { if (e.target.id === "backupModal") backupClose(); });
$("#backupModal").addEventListener("keydown", e => { if (e.key === "Escape") backupClose(); });
$("#backupDownload").addEventListener("click", () => {
  const t = new Date(), ymd = [t.getFullYear(), t.getMonth() + 1, t.getDate()].map(x => String(x).padStart(2, "0")).join("-");
  saveFile(`forge-backup-${ymd}.json`, JSON.stringify(backupMake()));
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
    else if (!this.lsWrite()) throw { code: "local" };
  },
  async remove(id) {
    clearTimeout(this.timers[id]); this.cache.delete(id);
    try { if (this.mode === "db") await this.col.doc(id).delete(); else this.lsWrite(); } catch { toast("Couldn't delete just now"); }
  }
};
function setBadge(state) {
  const b = $("#storeBadge");
  if (state) { b.textContent = state; return; }
  $("#backupBtn").hidden = Store.mode === "db"; // signed in: it's all on the server already
  if (Store.mode === "db") { b.textContent = "✓ Saved to your account"; b.className = "badge ok"; b.title = "Campaigns are stored privately with your Claude account"; }
  else { b.textContent = "Saved in this browser only"; b.className = "badge"; b.title = "Use 💾 Backup to keep a copy somewhere safe"; }
}
