/* 20-requests.js: the Requests tab (2026-11-19). Signed-in people send feature requests with everything needed to build
   them; they see their own, with the status and the owner's reply. The app's owner (FORGE_OWNER_EMAILS in Netlify's
   settings) sees everyone's, sets the status, replies, and copies a request as a brief for a Claude chat.
   Stored in the campaign database (feature_requests, /api/requests). An optional screenshot is shrunk here first. */

const RQ_KINDS = [["feature", "Something new"], ["change", "Change something that exists"], ["bug", "Something is broken"]];
const RQ_AREAS = [["generate", "Adventure"], ["npc", "NPCs"], ["world", "World and maps of the world"], ["monsters", "Villains & Monsters"], ["characters", "Characters and character sheets"],
  ["spells", "Spells"], ["feats", "Feats"], ["items", "Items and shops"], ["map", "Dungeon Map"], ["tv", "TV player screen"], ["tracker", "Campaign Tracker"], ["homebrew", "Homebrew"],
  ["party", "Party (DM)"], ["journal", "Journal"], ["import", "Importing characters or campaigns"], ["accounts", "Signing in, campaigns, sharing"], ["phone", "Using it on a phone"], ["other", "Something else"]];
const RQ_WHO = [["players", "Players"], ["dm", "The DM"], ["both", "Everyone"]];
const RQ_EDITIONS = [["none", "Not about rules"], ["2024", "2024 rules"], ["2014", "2014 rules"], ["both", "Both rule sets"]];
const RQ_OFTEN = [["every-session", "Every session"], ["sometimes", "Now and then"], ["rarely", "Rarely"]];
const RQ_DEVICES = [["phone", "Phone"], ["tablet", "Tablet"], ["laptop", "Laptop or computer"], ["tv", "TV screen"]];
const RQ_STATUS = [["new", "New"], ["planned", "Planned"], ["in-progress", "Being built"], ["done", "Done"], ["declined", "Not this time"]];
const rqLabel = (list, v) => (list.find(x => x[0] === v) || [, v])[1];
const RQ_BLANK = () => ({ title: "", kind: "feature", area: "", who: "both", problem: "", idea: "", steps: "", example: "", rules: "", edition: "none", often: "sometimes", devices: [] });
const RQ = { draft: RQ_BLANK(), image: null, list: null, owner: false, filter: "", /* the owner's list opens on All, so a request stays in view while it's marked and answered */ open: new Set(), busy: false, err: "" };

function rqSignedIn() { return !!(window.Portal && Portal.signedIn && Portal.signedIn()) && localStorage.getItem("dmforge.offline") !== "1"; }
async function rqLoad() {
  if (!rqSignedIn()) return;
  const r = await Portal.api("requests");
  if (r.ok) { RQ.list = r.data.requests || []; RQ.owner = !!r.data.owner; RQ.err = ""; } else RQ.err = r.data.error || "Couldn't load requests";
  rqRenderMain();
}
function renderRequests() {
  rqRenderSide(); rqRenderMain();
  if (rqSignedIn() && RQ.list === null) rqLoad();
}

/* ---- the form (side panel) ---- */
const rqOpts = (list, v) => list.map(([k, l]) => `<option value="${k}" ${v === k ? "selected" : ""}>${esc(l)}</option>`).join("");
function rqRenderSide() {
  const box = $("#rqSide"); if (!box) return;
  if (!rqSignedIn()) { box.innerHTML = `<div class="sec-h"><h3>Request a feature</h3></div><p>Sign in to send a request, so we can tell you when it's planned or done.</p>`; return; }
  const d = RQ.draft;
  box.innerHTML = `<div class="sec-h"><h3>Request a feature</h3></div>
    <p class="hint" style="margin-top:0">Tell us what you'd like the Forge to do. The more you explain, the easier it is to build exactly what you mean.</p>
    <form id="rqForm" autocomplete="off">
      <div class="field"><label for="rqTitle">Short title</label><input type="text" id="rqTitle" data-rq="title" maxlength="120" value="${esc(d.title)}" placeholder="e.g. Fold long lists away" required></div>
      <div class="field"><label for="rqKind">What kind of request?</label><select id="rqKind" data-rq="kind">${rqOpts(RQ_KINDS, d.kind)}</select></div>
      <div class="field"><label for="rqArea">Which part of the Forge?</label><select id="rqArea" data-rq="area"><option value="">Choose…</option>${rqOpts(RQ_AREAS, d.area)}</select></div>
      <div class="field"><label for="rqProblem">What are you trying to do, and what gets in the way today?</label><textarea id="rqProblem" data-rq="problem" maxlength="4000" placeholder="e.g. During a fight I have to scroll past hundreds of items to find the one I want." required>${esc(d.problem)}</textarea></div>
      <div class="field"><label for="rqIdea">How would you like it to work?</label><textarea id="rqIdea" data-rq="idea" maxlength="4000" placeholder="Describe the result you want, in your own words." required>${esc(d.idea)}</textarea></div>
      <div class="field"><label for="rqSteps">Step by step, what would you press and see? <span class="muted">(optional)</span></label><textarea id="rqSteps" data-rq="steps" maxlength="4000" placeholder="1. I open Items&#10;2. I press the arrow on a group&#10;3. The group folds away">${esc(d.steps)}</textarea></div>
      <div class="field"><label for="rqExample">An example, or another app that does it well <span class="muted">(optional)</span></label><textarea id="rqExample" data-rq="example" maxlength="2000">${esc(d.example)}</textarea></div>
      <div class="field row"><div><label for="rqWho">Who is it for?</label><select id="rqWho" data-rq="who">${rqOpts(RQ_WHO, d.who)}</select></div><div><label for="rqOften">How often would you use it?</label><select id="rqOften" data-rq="often">${rqOpts(RQ_OFTEN, d.often)}</select></div></div>
      <div class="field"><label for="rqEdition">Does it involve D&amp;D rules?</label><select id="rqEdition" data-rq="edition">${rqOpts(RQ_EDITIONS, d.edition)}</select></div>
      <div class="field ${d.edition === "none" ? "hidden" : ""}" id="rqRulesWrap"><label for="rqRules">Which rules? Book and page if you know them</label><textarea id="rqRules" data-rq="rules" maxlength="1000" placeholder="e.g. Player's Handbook 2024, p. 113: Eldritch Knight spellcasting">${esc(d.rules)}</textarea></div>
      <div class="field"><label>Where do you use it?</label><div class="rq-devices">${RQ_DEVICES.map(([k, l]) => `<label class="check"><input type="checkbox" data-rqdev="${k}" ${d.devices.includes(k) ? "checked" : ""}><span>${esc(l)}</span></label>`).join("")}</div></div>
      <div class="field"><label>A screenshot <span class="muted">(optional)</span></label>
        <p class="hint rq-shot-tip" style="margin:0 0 6px">📸 Requests with a screenshot are much more likely to be approved. Mark it up with arrows or notes if you can.</p>
        ${RQ.image ? `<div class="rq-shot"><img src="${esc(RQ.image)}" alt="Your screenshot"><button class="btn sm" type="button" data-rqimg="remove">✕ Remove</button></div>` : `<input type="file" id="rqFile" accept="image/png,image/jpeg,image/webp" aria-label="Choose a screenshot">`}
      </div>
      <button class="btn primary wide" type="submit" id="rqSend" ${RQ.busy ? "disabled" : ""}>${RQ.busy ? "Sending…" : "Send request"}</button>
    </form>`;
  box.querySelectorAll("textarea").forEach(autoGrow);
}
/* a picture shrunk to at most 1400 px and saved as JPEG, so it fits in the database */
function rqShrink(file) {
  return new Promise((res, rej) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { rej(new Error("Choose a PNG, JPEG or WebP picture")); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight; const k = Math.min(1, 1400 / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      let q = 0.85, out = cv.toDataURL("image/jpeg", q);
      while (out.length > 650000 && q > 0.35) { q -= 0.1; out = cv.toDataURL("image/jpeg", q); }
      out.length > 680000 ? rej(new Error("That picture is too large even when shrunk")) : res(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Couldn't read that picture")); };
    img.src = url;
  });
}
async function rqSend() {
  const d = RQ.draft;
  if (!d.title.trim()) { toast("Give your request a short title"); $("#rqTitle").focus(); return; }
  if (!d.area) { toast("Choose which part of the Forge it's about"); $("#rqArea").focus(); return; }
  if (d.problem.trim().length < 10) { toast("Say what you're trying to do, or what's wrong"); $("#rqProblem").focus(); return; }
  if (d.idea.trim().length < 10) { toast("Say how you'd like it to work"); $("#rqIdea").focus(); return; }
  RQ.busy = true; rqRenderSide();
  const r = await Portal.api("requests", { method: "POST", body: { ...d, image: RQ.image || undefined, displayName: Portal.myName ? Portal.myName() : "" } });
  RQ.busy = false;
  if (!r.ok) { rqRenderSide(); toast(r.data.error || "Couldn't send your request"); return; }
  RQ.draft = RQ_BLANK(); RQ.image = null; RQ.list = [r.data.request, ...(RQ.list || [])];
  rqRenderSide(); rqRenderMain(); toast("Thanks! Your request was sent");
}

/* ---- the list (main column) ---- */
function rqBrief(x) {
  const d = x.data || {}, L = (k, v) => v ? `**${k}:** ${v}` : "";
  return [`# Feature request: ${d.title}`, "",
    L("Kind", rqLabel(RQ_KINDS, d.kind)), L("Part of the Forge", rqLabel(RQ_AREAS, d.area)), L("For", rqLabel(RQ_WHO, d.who)), L("How often", rqLabel(RQ_OFTEN, d.often)),
    L("Devices", (d.devices || []).map(v => rqLabel(RQ_DEVICES, v)).join(", ")), L("Rules", d.edition && d.edition !== "none" ? rqLabel(RQ_EDITIONS, d.edition) + (d.rules ? ` (${d.rules})` : "") : ""),
    L("From", x.userName || ""), L("Sent", new Date(x.createdAt).toLocaleDateString()), x.image ? "**Screenshot:** attached in the Requests tab" : "", "",
    "## What they're trying to do", d.problem, "", "## How it should work", d.idea, ...(d.steps ? ["", "## Step by step", d.steps] : []), ...(d.example ? ["", "## Example", d.example] : [])]
    .filter((l, i, a) => l !== "" || (a[i - 1] !== "" && i)).join("\n");
}
function rqCardHTML(x) {
  const d = x.data || {}, open = RQ.open.has(x.id), st = x.status || "new";
  return `<div class="rq-card ${open ? "open" : ""}" data-id="${esc(x.id)}">
    <button class="rq-head" type="button" data-rqopen="${esc(x.id)}" aria-expanded="${open}"><b>${esc(d.title || "Untitled")}</b>
      <span class="tag rq-st rq-st-${esc(st)}">${esc(rqLabel(RQ_STATUS, st))}</span><span class="muted">${esc(rqLabel(RQ_AREAS, d.area))} · ${esc(new Date(x.createdAt).toLocaleDateString())}${RQ.owner && x.userName ? ` · ${esc(x.userName)}` : ""}</span></button>
    ${x.reply && !RQ.owner ? `<div class="rq-reply"><b>Reply:</b> ${esc(x.reply)}</div>` : ""}
    ${open ? `<div class="rq-body">
      <p class="muted" style="margin:0 0 8px">${esc(rqLabel(RQ_KINDS, d.kind))} · for ${esc(rqLabel(RQ_WHO, d.who).toLowerCase())} · ${esc(rqLabel(RQ_OFTEN, d.often).toLowerCase())}${(d.devices || []).length ? ` · ${esc(d.devices.map(v => rqLabel(RQ_DEVICES, v)).join(", "))}` : ""}${d.edition && d.edition !== "none" ? ` · ${esc(rqLabel(RQ_EDITIONS, d.edition))}` : ""}</p>
      <h4>What they're trying to do</h4><p class="rq-text">${esc(d.problem)}</p>
      <h4>How it should work</h4><p class="rq-text">${esc(d.idea)}</p>
      ${d.steps ? `<h4>Step by step</h4><p class="rq-text">${esc(d.steps)}</p>` : ""}${d.example ? `<h4>Example</h4><p class="rq-text">${esc(d.example)}</p>` : ""}${d.rules ? `<h4>Rules</h4><p class="rq-text">${esc(d.rules)}</p>` : ""}
      ${x.image && /^data:image\/(jpeg|png|webp);base64,/.test(x.image) ? `<a class="rq-img" href="${esc(x.image)}" download="request-screenshot.jpg" title="Download the screenshot"><img src="${esc(x.image)}" alt="Screenshot sent with the request" loading="lazy"></a>` : ""}
      ${RQ.owner ? `<div class="rq-owner">
        ${x.userEmail ? `<p class="hint" style="margin:0 0 8px">From ${esc(x.userName || "someone")} (${esc(x.userEmail)})</p>` : ""}
        <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label for="rqSt-${esc(x.id)}" style="margin:0">Status</label><select id="rqSt-${esc(x.id)}" data-rqstatus="${esc(x.id)}" style="flex:0 1 200px">${rqOpts(RQ_STATUS, st)}</select>
          <button class="btn sm" type="button" data-rqbrief="${esc(x.id)}" title="Copy everything as text to paste into a Claude chat">📋 Copy as a brief</button>
          <button class="btn sm danger" type="button" data-rqdel="${esc(x.id)}">✕ Delete</button></div>
        <label for="rqRe-${esc(x.id)}" style="margin-top:8px">Reply to them <span class="muted">(they see this)</span></label><textarea id="rqRe-${esc(x.id)}" data-rqreply="${esc(x.id)}" maxlength="2000">${esc(x.reply || "")}</textarea>
        <button class="btn sm primary" type="button" data-rqsave="${esc(x.id)}" style="margin-top:6px">Save reply</button></div>`
      : st === "new" && x.mine ? `<button class="btn sm danger" type="button" data-rqdel="${esc(x.id)}">✕ Take back this request</button>` : ""}
    </div>` : ""}</div>`;
}
function rqRenderMain() {
  const box = $("#rqMain"); if (!box) return;
  if (!rqSignedIn()) { box.innerHTML = `<div class="card empty"><h2>Help shape the Forge</h2><p>Signed-in players and DMs can ask for new features here, and see when they're planned or done.</p></div>`; return; }
  if (RQ.list === null) { box.innerHTML = `<div class="card"><p class="muted">${RQ.err ? esc(RQ.err) : "Loading requests…"}</p></div>`; return; }
  const L = RQ.list, counts = Object.fromEntries(RQ_STATUS.map(([k]) => [k, L.filter(x => x.status === k).length]));
  const shown = RQ.owner && RQ.filter ? L.filter(x => x.status === RQ.filter) : L;
  box.innerHTML = `<div class="card"><div class="sec-h"><h3>${RQ.owner ? "All requests" : "Your requests"}</h3><span class="sp"></span><button class="btn sm" type="button" data-rqreload="1">↻ Refresh</button></div>
    ${RQ.owner ? `<p class="hint" style="margin-top:0">You're the Forge's owner, so you see everyone's requests. Set a status and reply; the person sees both. 📋 Copy as a brief gives you the whole request as text for a Claude chat.</p>
      <div class="lore-chips">${[["", "All", L.length], ...RQ_STATUS.map(([k, l]) => [k, l, counts[k]])].map(([k, l, n]) => `<button type="button" class="chip ${RQ.filter === k ? "on" : ""}" data-rqfilter="${k}">${esc(l)} <span class="n">${n}</span></button>`).join("")}</div>` : ""}
    <div class="rq-list">${shown.length ? shown.map(rqCardHTML).join("") : `<p class="muted">${L.length ? "Nothing here." : RQ.owner ? "No requests yet." : "You haven't sent any requests yet. Use the form to send one."}</p>`}</div></div>`;
  box.querySelectorAll("textarea").forEach(autoGrow);
}

(function initRequests() {
  const side = $("#rqSide"), main = $("#rqMain"); if (!side || !main) return;
  side.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset.rq) { RQ.draft[t.dataset.rq] = t.value; if (t.tagName === "TEXTAREA") autoGrow(t); if (t.dataset.rq === "edition") $("#rqRulesWrap").classList.toggle("hidden", t.value === "none"); }
    else if (t.dataset.rqdev) { const k = t.dataset.rqdev, D = RQ.draft.devices; RQ.draft.devices = t.checked ? [...new Set([...D, k])] : D.filter(v => v !== k); }
  });
  side.addEventListener("change", async e => {
    const t = e.target; if (t.id !== "rqFile" || !t.files || !t.files[0]) return;
    try { RQ.image = await rqShrink(t.files[0]); rqRenderSide(); } catch (err) { toast(err.message); t.value = ""; }
  });
  side.addEventListener("click", e => { if (e.target.closest('[data-rqimg="remove"]')) { RQ.image = null; rqRenderSide(); } });
  side.addEventListener("submit", e => { e.preventDefault(); if (!RQ.busy) rqSend(); });
  main.addEventListener("click", async e => {
    const t = e.target, el = s => t.closest(s);
    let b;
    if (el("[data-rqreload]")) { RQ.list = null; rqRenderMain(); rqLoad(); return; }
    if (b = el("[data-rqfilter]")) { RQ.filter = b.dataset.rqfilter; rqRenderMain(); return; }
    if (b = el("[data-rqopen]")) { const id = b.dataset.rqopen; RQ.open.has(id) ? RQ.open.delete(id) : RQ.open.add(id); rqRenderMain(); return; }
    const find = id => (RQ.list || []).find(x => x.id === id);
    if (b = el("[data-rqbrief]")) { const x = find(b.dataset.rqbrief); if (!x) return; try { await navigator.clipboard.writeText(rqBrief(x)); toast("Copied: paste it into a Claude chat"); } catch { toast("Couldn't copy here"); } return; }
    if (b = el("[data-rqsave]")) {
      const id = b.dataset.rqsave, ta = main.querySelector(`[data-rqreply="${CSS.escape(id)}"]`);
      const r = await Portal.api("requests/" + id, { method: "PATCH", body: { reply: ta ? ta.value : "" } });
      if (!r.ok) { toast(r.data.error || "Couldn't save"); return; }
      RQ.list = RQ.list.map(x => x.id === id ? { ...x, ...r.data.request } : x); rqRenderMain(); toast("Reply saved"); return;
    }
    if (b = el("[data-rqdel]")) {
      const id = b.dataset.rqdel, x = find(id); if (!x) return;
      if (!(await confirmBox(RQ.owner ? "Delete request?" : "Take back request?", `“${(x.data && x.data.title) || "This request"}” will be removed. This can't be undone.`, RQ.owner ? "Delete" : "Take back"))) return;
      const r = await Portal.api("requests/" + id, { method: "DELETE" });
      if (!r.ok) { toast(r.data.error || "Couldn't remove it"); return; }
      RQ.list = RQ.list.filter(y => y.id !== id); rqRenderMain(); toast("Removed");
    }
  });
  main.addEventListener("change", async e => {
    const t = e.target; if (!t.dataset.rqstatus) return;
    const id = t.dataset.rqstatus, r = await Portal.api("requests/" + id, { method: "PATCH", body: { status: t.value } });
    if (!r.ok) { toast(r.data.error || "Couldn't save"); rqRenderMain(); return; }
    RQ.list = RQ.list.map(x => x.id === id ? { ...x, ...r.data.request } : x); rqRenderMain(); toast(`Marked ${rqLabel(RQ_STATUS, t.value).toLowerCase()}`);
  });
})();
