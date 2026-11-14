/* Dungeon Master's Forge: player and DM portals.
 *
 * Runs after the Forge's own script and works through the globals it already has
 * (PCS, RC, renderRoster…, toast, confirmBox, esc, $, $$). Signed in, characters
 * live in the shared campaign database instead of this browser:
 *  - players get the creator, their own characters, spells, items and whispers;
 *  - the DM gets every tool plus a Party tab with all sheets, an activity feed
 *    and whispers to one player at a time.
 * "Use without an account" keeps the old browser-only behaviour.
 */
import {
  getUser, login, logout, signup, handleAuthCallback, requestPasswordRecovery,
  updateUser, refreshSession, AuthError,
} from "@netlify/identity";

const OFFLINE_KEY = "dmforge.offline";
const CAMP_KEY = "dmforge.campaign";
const OFFERED_KEY = "dmforge.uploadOffered.";
const ALL_VIEWS = ["generate", "npc", "monsters", "character", "roster", "spells", "items", "map", "tracker"];
const PLAYER_VIEWS = ["character", "roster", "spells", "items", "whispers"];
const POLL_DM = 4000, POLL_PLAYER = 10000, POLL_WHISPERS = 15000;

const S = {
  user: null, campaigns: [], camp: null,
  synced: new Map(),   // character id -> { v: version, json: last saved JSON }
  owners: new Map(),   // character id -> { id, name }
  since: null, saveTimer: null, busy: false, again: false, pollTimer: null, whisperTimer: null,
  members: [], activity: [], whispers: [], renderPending: false,
};

const Portal = window.Portal = {
  cloud: false,
  views: null,       // null = everything (offline / DM tools only)
  home: "generate",
  changed: () => queueSave(),
  ownerTag,
  renderParty: () => renderParty(true),
  renderWhispers,
};

/* ------------------------------------------------------------ helpers */
async function api(path, opts = {}) {
  const res = await fetch("/api/" + path, {
    method: opts.method || "GET",
    headers: opts.body ? { "content-type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (res.status === 401 && !opts.retried) {
    // the session cookie may have just expired: refresh once and retry
    try { if (await refreshSession()) return api(path, { ...opts, retried: true }); } catch { }
  }
  return { ok: res.ok, status: res.status, data: data || {} };
}
const campPath = p => `campaigns/${S.camp.id}/${p}`;
const isDM = () => S.camp && S.camp.role === "dm";

function ago(t) {
  const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(t).toLocaleDateString();
}
function clock(t) { return new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function authMsg(e) {
  const m = (e && e.message) || "";
  if (e instanceof AuthError && e.status === 401 || /invalid.*(grant|credentials)|password/i.test(m)) return "That email and password don't match.";
  if (/not.*confirm/i.test(m)) return "Confirm your email first. Check your inbox for the link.";
  if (/already.*registered|exists/i.test(m)) return "There's already an account with that email. Sign in instead.";
  if (/identity/i.test(m) && /not|disabled|enable/i.test(m)) return "Sign-in isn't switched on for this site yet.";
  return m || "Something went wrong. Please try again.";
}
function setBadgeText(text, ok) {
  const b = $("#storeBadge"); if (!b) return;
  b.textContent = text; b.className = ok ? "badge ok" : "badge";
  b.title = ok ? "Characters are shared with your campaign" : "";
}
function unhide() { document.documentElement.classList.remove("gate-wait"); }

/* ------------------------------------------------------------ gate (sign in / campaign setup) */
function gate(html) {
  let g = $("#gate");
  if (!g) {
    g = document.createElement("div"); g.id = "gate"; g.setAttribute("role", "dialog"); g.setAttribute("aria-modal", "true");
    document.body.appendChild(g);
  }
  g.innerHTML = `<div class="card gate-box">
    <div class="gate-head"><h2>Dungeon Master's Forge</h2></div>${html}</div>`;
  g.classList.add("open"); unhide();
  const f = g.querySelector("input"); if (f) f.focus();
  return g;
}
function closeGate() { const g = $("#gate"); if (g) g.classList.remove("open"); }
function gateError(g, msg) { const e = g.querySelector(".gate-err"); if (e) { e.textContent = msg; e.hidden = !msg; } }
function busy(form, on) { form.querySelectorAll("button").forEach(b => b.disabled = on); }

function showSignIn(mode = "in", note = "") {
  const up = mode === "up";
  const g = gate(`
    <p class="muted">${up ? "Create an account to join your DM's campaign." : "Sign in to reach your campaign and characters."}</p>
    ${note ? `<p class="gate-note">${esc(note)}</p>` : ""}
    <form id="gateForm" autocomplete="on">
      ${up ? `<div class="field"><label for="gName">Your name</label><input type="text" id="gName" maxlength="40" autocomplete="name" required></div>` : ""}
      <div class="field"><label for="gEmail">Email</label><input type="email" id="gEmail" autocomplete="email" required></div>
      <div class="field"><label for="gPass">Password</label><input type="password" id="gPass" minlength="${up ? 8 : 1}" autocomplete="${up ? "new-password" : "current-password"}" required></div>
      <p class="gate-err" role="alert" hidden></p>
      <button class="btn primary wide" type="submit">${up ? "Create account" : "Sign in"}</button>
    </form>
    <div class="gate-links">
      <button class="linkish" type="button" data-g="${up ? "in" : "up"}">${up ? "I already have an account" : "New here? Create an account"}</button>
      ${up ? "" : `<button class="linkish" type="button" data-g="forgot">Forgot password?</button>`}
    </div>
    <div class="gate-foot"><button class="linkish" type="button" data-g="offline">Use without an account</button>
      <small class="muted">DM tools only, saved in this browser. Players need an account.</small></div>`);
  g.querySelector("#gateForm").onsubmit = async e => {
    e.preventDefault(); const form = e.target; gateError(g, ""); busy(form, true);
    const email = $("#gEmail").value.trim(), pass = $("#gPass").value;
    try {
      if (up) {
        const name = $("#gName").value.trim();
        const u = await signup(email, pass, { full_name: name });
        localStorage.setItem("dmforge.name", name);
        if (!u || !u.confirmedAt) { showSignIn("in", `Almost there: we sent a confirmation link to ${email}. Open it, then sign in here.`); return; }
      } else await login(email, pass);
      await enter();
    } catch (err) { gateError(g, authMsg(err)); busy(form, false); }
  };
  g.querySelector(".gate-links").onclick = g.querySelector(".gate-foot").onclick = e => {
    const k = e.target.closest("[data-g]"); if (!k) return;
    if (k.dataset.g === "offline") goOffline();
    else if (k.dataset.g === "forgot") showForgot();
    else showSignIn(k.dataset.g);
  };
}

function showForgot() {
  const g = gate(`<p class="muted">Enter your email and we'll send a link to set a new password.</p>
    <form id="gateForm"><div class="field"><label for="gEmail">Email</label><input type="email" id="gEmail" autocomplete="email" required></div>
    <p class="gate-err" role="alert" hidden></p><button class="btn primary wide" type="submit">Send reset link</button></form>
    <div class="gate-links"><button class="linkish" type="button" data-g="in">Back to sign in</button></div>`);
  g.querySelector("#gateForm").onsubmit = async e => {
    e.preventDefault(); busy(e.target, true);
    try { await requestPasswordRecovery($("#gEmail").value.trim()); showSignIn("in", "If that email has an account, a reset link is on its way."); }
    catch (err) { gateError(g, authMsg(err)); busy(e.target, false); }
  };
  g.querySelector(".gate-links").onclick = () => showSignIn("in");
}

function showNewPassword() {
  const g = gate(`<p class="muted">Choose a new password.</p>
    <form id="gateForm"><div class="field"><label for="gPass">New password</label><input type="password" id="gPass" minlength="8" autocomplete="new-password" required></div>
    <p class="gate-err" role="alert" hidden></p><button class="btn primary wide" type="submit">Save password</button></form>`);
  g.querySelector("#gateForm").onsubmit = async e => {
    e.preventDefault(); busy(e.target, true);
    try { await updateUser({ password: $("#gPass").value }); toast("Password updated"); await enter(); }
    catch (err) { gateError(g, authMsg(err)); busy(e.target, false); }
  };
}

function showSetup(note = "") {
  const name = (S.user && S.user.name) || localStorage.getItem("dmforge.name") || "";
  const g = gate(`
    ${note ? `<p class="gate-note">${esc(note)}</p>` : ""}
    <p class="muted">Signed in as ${esc(S.user.email)}.</p>
    <form id="joinForm" class="gate-sec">
      <h3>Join a campaign</h3>
      <p class="muted">Your DM gives you a code like <b>VX7-K2Q</b>.</p>
      <div class="row"><div class="field"><label for="jCode">Join code</label><input type="text" id="jCode" maxlength="9" autocapitalize="characters" autocomplete="off" required></div>
      <div class="field"><label for="jName">Name the DM sees</label><input type="text" id="jName" maxlength="40" value="${esc(name)}" required></div></div>
      <button class="btn primary wide" type="submit">Join campaign</button>
    </form>
    <form id="dmForm" class="gate-sec">
      <h3>Run a campaign as DM</h3>
      <div class="row"><div class="field"><label for="dCamp">Campaign name</label><input type="text" id="dCamp" maxlength="80" required></div>
      <div class="field"><label for="dName">Your name</label><input type="text" id="dName" maxlength="40" value="${esc(name)}" required></div></div>
      <button class="btn wide" type="submit">Create campaign</button>
    </form>
    <p class="gate-err" role="alert" hidden></p>
    <div class="gate-links">${S.campaigns.length ? `<button class="linkish" type="button" data-g="back">Back to ${esc(S.camp ? S.camp.name : S.campaigns[0].name)}</button>` : ""}
      <button class="linkish" type="button" data-g="out">Sign out</button></div>`);
  g.querySelector("#joinForm").onsubmit = async e => {
    e.preventDefault(); gateError(g, ""); busy(e.target, true);
    const r = await api("join", { method: "POST", body: { code: $("#jCode").value, displayName: $("#jName").value } });
    if (!r.ok) { gateError(g, r.data.error || "Couldn't join just now"); busy(e.target, false); return; }
    localStorage.setItem(CAMP_KEY, r.data.id); await enter();
  };
  g.querySelector("#dmForm").onsubmit = async e => {
    e.preventDefault(); gateError(g, ""); busy(e.target, true);
    const r = await api("campaigns", { method: "POST", body: { name: $("#dCamp").value, displayName: $("#dName").value } });
    if (!r.ok) { gateError(g, r.data.error || "Couldn't create the campaign"); busy(e.target, false); return; }
    localStorage.setItem(CAMP_KEY, r.data.id); await enter();
  };
  g.querySelector(".gate-links").onclick = async e => {
    const k = e.target.closest("[data-g]"); if (!k) return;
    if (k.dataset.g === "out") signOut(); else { closeGate(); if (!Portal.cloud) await enter(); }
  };
}

function goOffline() {
  localStorage.setItem(OFFLINE_KEY, "1");
  closeGate(); unhide(); applyMode(null); acctButton();
}

async function signOut() {
  stopLoops();
  try { await logout(); } catch { }
  localStorage.removeItem(CAMP_KEY);
  location.hash = ""; location.reload();
}

/* ------------------------------------------------------------ account button in the header */
function acctButton() {
  let b = $("#acctBtn");
  if (!b) {
    b = document.createElement("button"); b.id = "acctBtn"; b.type = "button"; b.className = "btn sm";
    $("#storeBadge").after(b);
    b.onclick = () => {
      if (!S.user) { localStorage.removeItem(OFFLINE_KEY); showSignIn(); return; }
      openAccount();
    };
  }
  b.textContent = S.user ? (S.camp ? `${S.camp.displayName || "Me"} · ${S.camp.name}` : S.user.email) : "Sign in";
  b.title = S.user ? "Account and campaigns" : "Sign in to share characters with your campaign";
}

function openAccount() {
  const others = S.campaigns.filter(c => !S.camp || c.id !== S.camp.id);
  const g = gate(`
    <p class="muted">Signed in as ${esc(S.user.email)}.</p>
    ${S.camp ? `<p>In <b>${esc(S.camp.name)}</b> as ${isDM() ? "the DM" : "a player"}.</p>` : ""}
    ${others.length ? `<div class="gate-sec"><h3>Switch campaign</h3>${others.map(c =>
      `<button class="camp-item" type="button" data-sw="${esc(c.id)}"><b>${esc(c.name)}</b><small>${c.role === "dm" ? "DM" : "Player"}</small></button>`).join("")}</div>` : ""}
    <div class="gate-links"><button class="linkish" type="button" data-g="setup">Join or start another campaign</button>
      <button class="linkish" type="button" data-g="out">Sign out</button>
      <button class="linkish" type="button" data-g="close">Close</button></div>`);
  g.querySelector(".gate-box").onclick = async e => {
    const sw = e.target.closest("[data-sw]");
    if (sw) { localStorage.setItem(CAMP_KEY, sw.dataset.sw); location.reload(); return; }
    const k = e.target.closest("[data-g]"); if (!k) return;
    if (k.dataset.g === "out") signOut();
    else if (k.dataset.g === "setup") showSetup();
    else closeGate();
  };
}

/* ------------------------------------------------------------ portal mode */
function applyMode(camp) {
  const player = camp && camp.role === "player";
  Portal.views = !camp ? null : player ? PLAYER_VIEWS : [...ALL_VIEWS, "party"];
  Portal.home = player ? "character" : "generate";
  document.body.classList.toggle("portal-player", !!player);
  document.body.classList.toggle("portal-dm", !!camp && !player);
  $$("nav a[data-view]").forEach(a => {
    const v = a.dataset.view;
    a.hidden = Portal.views ? !Portal.views.includes(v) : (v === "party" || v === "whispers");
  });
  route();
}

async function enter() {
  S.user = await getUser();
  if (!S.user) { showSignIn(); return; }
  const me = await api("me");
  if (!me.ok) {
    gate(`<p class="gate-err" role="alert">${esc(me.data.error || "Couldn't reach the campaign server.")}</p>
      <div class="gate-links"><button class="linkish" type="button" onclick="location.reload()">Try again</button></div>`);
    return;
  }
  S.campaigns = me.data.campaigns;
  if (!S.user.name && me.data.user.name) S.user.name = me.data.user.name;
  const want = localStorage.getItem(CAMP_KEY);
  S.camp = S.campaigns.find(c => c.id === want) || S.campaigns[0] || null;
  acctButton();
  if (!S.camp) { showSetup(); return; }
  localStorage.setItem(CAMP_KEY, S.camp.id);
  closeGate();
  await startCloud();
}

/* ------------------------------------------------------------ character sync */
async function startCloud() {
  stopLoops();
  const localRoster = PCS.roster.slice();
  Portal.cloud = true;
  S.synced.clear(); S.owners.clear(); S.since = null;
  setBadgeText("Loading characters…");
  applyMode(S.camp);

  const r = await api(campPath("characters"));
  if (!r.ok) { setBadgeText("Couldn't load characters"); toast(r.data.error || "Couldn't load characters"); return; }
  S.since = r.data.now;
  PCS.roster = r.data.characters.map(ch => { remember(ch); return ch.data; });
  PCS.roster.forEach(pcEnsure);
  RC.id = null; currentPC = null;
  rerender(true);
  setBadgeText("✓ Shared with campaign", true);

  // Characters made before signing in can be brought along once.
  const flag = OFFERED_KEY + S.camp.id + "." + S.user.id;
  const extra = localRoster.filter(c => !S.synced.has(c.id));
  if (extra.length && !localStorage.getItem(flag)) {
    localStorage.setItem(flag, "1");
    const names = extra.map(c => c.name).slice(0, 6).join(", ") + (extra.length > 6 ? "…" : "");
    const yes = await confirmBox(
      `Bring ${extra.length} character${extra.length > 1 ? "s" : ""} into ${S.camp.name}?`,
      `These are saved in this browser only: ${names}. Adding them shares them with ${isDM() ? "the campaign" : "your DM"}.`,
      "Add them");
    if (yes) { PCS.roster.push(...extra.map(c => JSON.parse(JSON.stringify(c)))); rerender(true); queueSave(); }
  }

  const tick = async () => { await poll(); S.pollTimer = setTimeout(tick, isDM() ? POLL_DM : POLL_PLAYER); };
  S.pollTimer = setTimeout(tick, isDM() ? POLL_DM : POLL_PLAYER);
  if (!isDM()) { loadWhispers(); S.whisperTimer = setInterval(loadWhispers, POLL_WHISPERS); }
  else loadParty();
}

function stopLoops() { clearTimeout(S.pollTimer); clearInterval(S.whisperTimer); clearTimeout(S.saveTimer); }

function remember(ch) {
  S.synced.set(ch.id, { v: ch.version, json: JSON.stringify(ch.data) });
  if (ch.ownerId) S.owners.set(ch.id, { id: ch.ownerId, name: ch.ownerName });
}

function ownerTag(c) {
  if (!Portal.cloud || !isDM()) return "";
  const o = S.owners.get(c.id);
  if (!o || o.id === S.user.id) return "";
  return `<em class="owner-tag">${esc(o.name || "Player")}</em>`;
}

function queueSave() {
  if (!Portal.cloud) return;
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(flush, 700);
}

async function flush() {
  if (S.busy) { S.again = true; return; }
  S.busy = true; setBadgeText("Saving…");
  let failed = false;
  try {
    const ids = new Set();
    for (const c of PCS.roster.slice()) {
      if (!c || !c.id) continue;
      ids.add(c.id);
      const json = JSON.stringify(c), s = S.synced.get(c.id);
      if (s && s.json === json) continue;
      if (!s) {
        const r = await api(campPath("characters"), { method: "POST", body: { id: c.id, data: c } });
        if (r.ok) { remember({ ...r.data, data: JSON.parse(json) }); continue; }
        if (r.status === 409 && r.data.current) { c.id = c.id + "-" + Math.random().toString(36).slice(2, 6); S.again = true; continue; }
        failed = true; toast(r.data.error || `Couldn't save ${c.name}`); continue;
      }
      const r = await api(campPath("characters/" + encodeURIComponent(c.id)), { method: "PUT", body: { data: c, baseVersion: s.v } });
      if (r.ok) { S.synced.set(c.id, { v: r.data.version, json }); continue; }
      if (r.status === 409 && r.data.current) { await resolveClash(c, json, r.data.current); continue; }
      if (r.status === 404) { dropLocal(c.id); toast(`${c.name} was deleted by someone else`); continue; }
      if (r.status === 403) { toast(r.data.error || `You can't change ${c.name}`); restore(c.id); continue; }
      failed = true;
    }
    for (const id of [...S.synced.keys()]) {
      if (ids.has(id)) continue;
      const r = await api(campPath("characters/" + encodeURIComponent(id)), { method: "DELETE" });
      if (r.ok || r.status === 404) { S.synced.delete(id); S.owners.delete(id); }
      else if (r.status === 403) { toast(r.data.error || "You can't delete that character"); S.synced.delete(id); S.since = null; }
      else failed = true;
    }
  } catch { failed = true; }
  S.busy = false;
  if (failed) { setBadgeText("Not saved, retrying…"); clearTimeout(S.saveTimer); S.saveTimer = setTimeout(flush, 5000); }
  else setBadgeText("✓ Shared with campaign", true);
  if (S.again) { S.again = false; flush(); }
}

async function resolveClash(c, mine, current) {
  const who = current.updatedByName || "Someone";
  const keep = await confirmBox(
    `${who} just changed ${current.data.name || "this sheet"}`,
    `${who} saved this sheet ${ago(current.updatedAt)}, while you were editing it. Keep your version and overwrite theirs, or cancel to load theirs instead.`,
    "Keep mine");
  if (keep) {
    const r = await api(campPath("characters/" + encodeURIComponent(c.id)), { method: "PUT", body: { data: JSON.parse(mine), force: true } });
    if (r.ok) S.synced.set(c.id, { v: r.data.version, json: mine });
    else toast(r.data.error || "Couldn't save");
  } else {
    remember(current);
    replaceLocal(current.data);
    rerender(true);
  }
}

function replaceLocal(data) {
  const i = PCS.roster.findIndex(x => x.id === data.id);
  const copy = pcEnsure(JSON.parse(JSON.stringify(data)));
  if (i >= 0) PCS.roster[i] = copy; else PCS.roster.push(copy);
}
function dropLocal(id) { PCS.roster = PCS.roster.filter(x => x.id !== id); S.synced.delete(id); S.owners.delete(id); rerender(true); }
function restore(id) { const s = S.synced.get(id); if (s) { replaceLocal(JSON.parse(s.json)); rerender(true); } }

async function poll() {
  if (!Portal.cloud || S.busy || document.hidden) return;
  const r = await api(campPath("characters") + (S.since ? "?since=" + encodeURIComponent(S.since) : ""));
  if (!r.ok) {
    if (r.status === 403) { toast("You're no longer in this campaign"); localStorage.removeItem(CAMP_KEY); setTimeout(() => location.reload(), 1500); }
    return;
  }
  if (S.busy) return; // a save started meanwhile; pick these up next time
  S.since = r.data.now;
  let changed = false;
  for (const ch of r.data.characters) {
    const s = S.synced.get(ch.id), local = PCS.roster.find(x => x.id === ch.id);
    S.owners.set(ch.id, { id: ch.ownerId, name: ch.ownerName });
    if (s && ch.version <= s.v) continue;
    // Only take the newer copy if there's nothing unsaved here; otherwise the
    // next save hits the clash warning and the person chooses.
    if (!local || !s || JSON.stringify(local) === s.json) { remember(ch); replaceLocal(ch.data); changed = true; }
  }
  for (const id of r.data.deleted) {
    if (!S.synced.has(id)) continue;
    PCS.roster = PCS.roster.filter(x => x.id !== id); S.synced.delete(id); S.owners.delete(id); changed = true;
  }
  if (changed) rerender();
  if (isDM() && location.hash === "#party") loadParty();
}

function rerender(force) {
  const view = $("#view-roster"), a = document.activeElement;
  // don't rebuild the sheet under someone's cursor; catch up when they leave the field
  if (!force && a && view.contains(a) && a.matches("input, textarea, select")) { S.renderPending = true; return; }
  S.renderPending = false;
  if (view.classList.contains("active")) renderRosterTab(); else renderRoster();
  if (location.hash === "#party") renderParty();
}
document.addEventListener("focusout", () => setTimeout(() => { if (S.renderPending) rerender(); }, 50));

/* ------------------------------------------------------------ DM: party tab */
async function loadParty() {
  if (!isDM()) return;
  const [m, a, w] = await Promise.all([api(campPath("members")), api(campPath("activity")), api(campPath("whispers"))]);
  if (m.ok) S.members = m.data;
  if (a.ok) S.activity = a.data;
  if (w.ok) S.whispers = w.data;
  renderParty();
}

function partyCard(c) {
  const o = S.owners.get(c.id) || {};
  const last = S.activity.find(x => x.characterId === c.id);
  const hp = c.hpCur ?? c.hp;
  const low = c.hp && hp / c.hp <= 0.35;
  return `<button class="party-card" type="button" data-open="${esc(c.id)}">
    <b>${esc(c.name)}</b> <small class="muted">${esc(o.id === S.user.id ? "DM" : o.name || "")}</small>
    <span class="pc-line">Lv ${esc(c.level)} ${esc(c.race || "")} ${esc(c.cls || "")}</span>
    <span class="pc-stats"><span class="${low ? "hp-low" : ""}">HP ${esc(hp)}/${esc(c.hp)}</span><span>AC ${esc(c.ac)}</span></span>
    ${last ? `<small class="muted">● edited ${esc(ago(last.at))}</small>` : ""}
  </button>`;
}

function renderParty(fetch) {
  const host = $("#partyMain"); if (!host || !isDM()) return;
  if (fetch) loadParty();
  const players = S.members.filter(m => m.role === "player");
  const sheets = PCS.roster.slice().sort((a, b) => {
    const oa = (S.owners.get(a.id) || {}).name || "", ob = (S.owners.get(b.id) || {}).name || "";
    return oa.localeCompare(ob) || String(a.name).localeCompare(b.name);
  });
  const keep = { to: $("#whTo") && $("#whTo").value, body: $("#whBody") && $("#whBody").value, focus: document.activeElement && document.activeElement.id };
  $("#partySide").innerHTML = `
    <div class="sec-h"><h3>${esc(S.camp.name)}</h3></div>
    <div class="field"><span class="lbl">Join code</span>
      <div class="row"><code class="join-code">${esc(S.camp.code || "")}</code><button class="btn sm" type="button" id="copyCode" style="flex:0">Copy</button></div>
      <small class="muted">Players enter this once after creating an account.</small></div>
    <div class="sec-h"><h3>Players</h3></div>
    ${players.length ? players.map(p => `<div class="member"><div><b>${esc(p.name)}</b><small class="muted">${esc(p.email || "")}</small></div>
      <button class="btn sm danger" type="button" data-kick="${esc(p.id)}" aria-label="Remove ${esc(p.name)}">Remove</button></div>`).join("")
      : `<p class="muted">No players yet. Share the join code.</p>`}`;
  host.innerHTML = `
    <div class="card"><div class="sec-h"><h3>Party</h3><span class="sp"></span><small class="muted">Click a sheet to view or edit it</small></div>
      ${sheets.length ? `<div class="party-grid">${sheets.map(partyCard).join("")}</div>` : `<p class="muted">No characters yet. They appear here as soon as a player saves one.</p>`}</div>
    <div class="card"><div class="sec-h"><h3>Whisper</h3></div>
      ${players.length ? `<form id="whForm"><div class="row"><select id="whTo" aria-label="Player" style="flex:0 0 180px">${players.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}</select>
        <input type="text" id="whBody" maxlength="2000" placeholder="Only this player will see it…" aria-label="Message" autocomplete="off">
        <button class="btn primary" type="submit" style="flex:0">Send</button></div></form>
        ${S.whispers.length ? `<ul class="feed">${S.whispers.slice(0, 8).map(w => `<li><time>${esc(clock(w.at))}</time><span>To <b>${esc(w.toName || "player")}</b>: ${esc(w.body)} <small class="muted">${w.read ? "· read" : "· unread"}</small></span></li>`).join("")}</ul>` : ""}`
      : `<p class="muted">Whispers open up once a player joins.</p>`}</div>
    <div class="card"><div class="sec-h"><h3>Activity</h3></div>
      ${S.activity.length ? `<ul class="feed">${S.activity.map(a => `<li><time title="${esc(new Date(a.at).toLocaleString())}">${esc(clock(a.at))}</time><span><b>${esc(a.byDM ? "You" : a.actor)}</b> · ${esc(a.characterName)}: ${esc(a.summary)}</span></li>`).join("")}</ul>`
      : `<p class="muted">Changes players make to their sheets show up here.</p>`}</div>`;
  if (keep.to && $("#whTo")) $("#whTo").value = keep.to;
  if (keep.body && $("#whBody")) $("#whBody").value = keep.body;
  if (keep.focus && $("#" + keep.focus)) $("#" + keep.focus).focus();
}

async function sendWhisper(e) {
  e.preventDefault();
  const to = $("#whTo").value, body = $("#whBody").value.trim();
  if (!body) return;
  const btn = e.target.querySelector("button"); btn.disabled = true;
  const r = await api(campPath("whispers"), { method: "POST", body: { to, body } });
  btn.disabled = false;
  if (!r.ok) { toast(r.data.error || "Couldn't send"); return; }
  $("#whBody").value = "";
  toast(`Whispered to ${(S.members.find(m => m.id === to) || {}).name || "player"}`);
  loadParty();
}

document.addEventListener("submit", e => { if (e.target.id === "whForm") sendWhisper(e); });
document.addEventListener("click", async e => {
  const open = e.target.closest("[data-open]");
  if (open) { RC.id = open.dataset.open; location.hash = "#roster"; renderRosterTab(); return; }
  if (e.target.id === "copyCode") {
    try { await navigator.clipboard.writeText(S.camp.code); toast("Join code copied"); } catch { toast(S.camp.code); }
    return;
  }
  const kick = e.target.closest("[data-kick]");
  if (kick) {
    const p = S.members.find(m => m.id === kick.dataset.kick); if (!p) return;
    if (!(await confirmBox(`Remove ${p.name}?`, `${p.name} loses access to this campaign. Their characters stay on your Party tab.`, "Remove"))) return;
    const r = await api(campPath("members/" + encodeURIComponent(p.id)), { method: "DELETE" });
    if (r.ok) { toast(`${p.name} removed`); loadParty(); } else toast(r.data.error || "Couldn't remove");
  }
});

/* ------------------------------------------------------------ player: whispers */
async function loadWhispers() {
  if (!Portal.cloud || isDM() || document.hidden) return;
  const r = await api(campPath("whispers"));
  if (!r.ok) return;
  const before = S.whispers.filter(w => !w.read).length;
  S.whispers = r.data;
  const unread = S.whispers.filter(w => !w.read).length;
  const badge = $("#whisperN");
  if (badge) { badge.textContent = unread || ""; badge.hidden = !unread; }
  if (unread > before && location.hash !== "#whispers") toast("📜 New whisper from your DM");
  if (location.hash === "#whispers") renderWhispers();
}

async function renderWhispers() {
  const host = $("#whispersMain"); if (!host) return;
  host.innerHTML = S.whispers.length
    ? `<ul class="feed whispers">${S.whispers.map(w => `<li class="${w.read ? "" : "unread"}"><time title="${esc(new Date(w.at).toLocaleString())}">${esc(ago(w.at))}</time><span>${esc(w.body)}</span></li>`).join("")}</ul>`
    : `<p class="muted">Nothing yet. Private notes from your DM will appear here.</p>`;
  if (S.whispers.some(w => !w.read)) {
    await api(campPath("whispers/read"), { method: "POST" });
    S.whispers.forEach(w => w.read = true);
    const badge = $("#whisperN"); if (badge) badge.hidden = true;
  }
}

/* ------------------------------------------------------------ boot */
(async function boot() {
  applyMode(null);
  let cb = null;
  try { cb = await handleAuthCallback(); } catch (e) { showSignIn("in", authMsg(e)); return; }
  if (cb && cb.type === "recovery") { showNewPassword(); return; }
  if (cb && cb.type === "confirmation") toast("Email confirmed. Welcome!");
  let user = null;
  try { user = await getUser(); } catch { user = null; }
  if (user) { await enter(); return; }
  if (localStorage.getItem(OFFLINE_KEY) === "1") { unhide(); acctButton(); return; }
  showSignIn();
})().catch(err => { console.error(err); unhide(); toast("Couldn't start sign-in. Using this browser only."); acctButton(); });
