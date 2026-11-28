/* 05-tracker.js: Campaign Tracker: campaigns, NPC pictures, Lore, session recaps, calendar and weather, and the encounter tracker. */

/* ======================= Campaign tracker ======================= */
let activeId = null, subTab = "overview";
function blankCampaign(name = "New Campaign") {
  return { id: uid("c"), name, created: Date.now(), updated: Date.now(), currentLevel: 1, gen: null, chapters: [], encounters: [], sessions: [], party: [], npcs: [], lore: [], quests: [], loot: [], maps: [], notes: "", secrets: "" };
}
function saveGenAsCampaign(g) {
  const c = blankCampaign(g.core.title);
  c.gen = g; c.currentLevel = g.settings.min;
  c.chapters = g.outline.kind === "campaign"
    ? g.outline.chapters.map((ch, i) => ({ id: uid("ch"), title: `${ch.title} (Lv ${ch.level})`, done: false, note: chapterBrief(g, i) }))
    : g.outline.scenes.map((sc, i) => ({ id: uid("ch"), title: sc.title, done: false, note: sceneBrief(g, i) }));
  c.npcs = g.npcs.map(n => ({ id: uid("n"), name: n.name, role: `${n.race} ${n.role}`, attitude: "Unknown", notes: `Quirk: ${n.trait}. Secret: ${n.secret}.` }))
    .concat([{ id: uid("n"), name: g.core.villain.name, role: g.core.villain.archetype, attitude: "Hostile", notes: `Villain. ${cap1(g.core.villain.motive)}.` }]);
  c.quests = [{ id: uid("q"), title: g.core.objective, status: "Active", giver: g.npcs[0].name, notes: g.core.premise }];
  c.secrets = `Twist: ${g.twist}`;
  Store.save(c); activeId = c.id; subTab = "overview"; location.hash = "tracker"; renderTracker(); toast("Campaign saved");
}
const LISTS = {
  sessions: { label: "Sessions", add: "Log session", fields: [["title", "text", "Session title"], ["num", "number", "#"], ["date", "date", "Date"], ["players", "select", "Players see it", ["Yes", "No"]], ["summary", "textarea", "What happened? Key decisions, loot, cliffhanger…"]] },
  party: { label: "Party", add: "Add character", fields: [["name", "text", "Character name"], ["cls", "text", "Race & class"], ["level", "number", "Level"], ["player", "text", "Player"], ["notes", "textarea", "Backstory hooks, goals, bonds…"]] },
  npcs: { label: "NPCs", add: "Add NPC", fields: [["name", "text", "NPC name"], ["role", "text", "Role"], ["attitude", "select", "Attitude", ["Friendly", "Neutral", "Unknown", "Hostile", "Dead"]], ["notes", "textarea", "Notes"]] },
  quests: { label: "Quests", add: "Add quest", fields: [["title", "text", "Quest"], ["status", "select", "Status", ["Active", "On hold", "Completed", "Failed"]], ["giver", "text", "Given by"], ["players", "select", "Players see it", ["Yes", "No"]], ["notes", "textarea", "Details, clues, rewards… (only you see these)"]] },
  loot: { label: "Loot", add: "Add item", fields: [["item", "text", "Item"], ["holder", "text", "Carried by"], ["value", "text", "Value"], ["notes", "textarea", "Properties, attunement…"]] }
};
function renderCampList() {
  const list = Store.list();
  $("#campList").innerHTML = list.length ? list.map(c => {
    const done = (c.chapters || []).filter(x => x.done).length, tot = (c.chapters || []).length;
    return `<button class="camp-item ${c.id === activeId ? "on" : ""}" data-camp="${c.id}"><b>${esc(c.name)}</b><small>Lv ${c.currentLevel || 1} · ${(c.sessions || []).length} sessions${tot ? ` · ${Math.round(done / tot * 100)}%` : ""}</small></button>`;
  }).join("") : `<p class="muted" style="font-size:15px">No campaigns yet. Forge one in the Generator, or start blank.</p>`;
  $$(".campSelect").forEach(sel => {
    const keep = sel.value;
    sel.innerHTML = list.length ? list.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("") : `<option value="">No campaigns yet</option>`;
    if (list.some(c => c.id === keep)) sel.value = keep; else if (activeId && list.some(c => c.id === activeId)) sel.value = activeId;
  });
}
/* the Tracker, and the fight window over it when one is open (05b-fight.js) */
function renderTracker() { renderTrackerMain(); if (typeof FIGHT !== "undefined" && FIGHT.eid) fightRender(); }
function renderTrackerMain() {
  renderCampList();
  const c = Store.get(activeId) || Store.list()[0];
  const main = $("#campMain");
  if (!c) {
    /* a section picked from the side menu (Loot, Lore…) with no campaign yet: say where it lives, and start one on that section (QA idea, 2026-11-24) */
    const sec = window.sideReady && subTab !== "overview" ? (SIDE_SECTIONS.tracker.find(([k]) => k === subTab) || [])[1] : "";
    main.innerHTML = `<div class="card empty"><h2>No campaign yet</h2><p>${sec ? `${esc(sec)} is kept in a campaign. ` : ""}Start a blank campaign, or forge an adventure in the Generator and save it here.</p><button type="button" class="btn primary" data-newcamp="1">+ Start a blank campaign</button> <a class="btn" href="#generate" style="text-decoration:none;display:inline-block">Go to Generator</a></div>`;
    return;
  }
  activeId = c.id; renderCampList();
  if (c.gen && c.gen.outline) {
    // Upgrade short auto-generated chapter notes (from older saves) to full briefs; notes the DM edited are left alone.
    let changed = false;
    if (c.gen.outline.kind === "campaign") c.gen.outline.chapters.forEach((gc, i) => { const t = c.chapters.find(x => x.title === `${gc.title} (Lv ${gc.level})`); if (t && t.note === `${gc.goal}. ${gc.location}.`) { t.note = chapterBrief(c.gen, i); changed = true; } });
    else (c.gen.outline.scenes || []).forEach((sc, i) => { const t = c.chapters.find(x => x.title === sc.title); if (t && !t.note) { t.note = sceneBrief(c.gen, i); changed = true; } });
    if (changed) Store.save(c);
  }
  if (seedEncounters(c)) Store.save(c);
  registerBestiary(c);
  const done = c.chapters.filter(x => x.done).length, tot = c.chapters.length, pct = tot ? Math.round(done / tot * 100) : 0;
  const active = c.quests.filter(q => q.status === "Active").length;
  const tabs = [["overview", "Overview"], ["session", "Open Session"], ["encounters", "Encounters", (c.encounters || []).length], ["sessions", "Sessions", c.sessions.length], ["party", "Party", c.party.length], ["npcs", "NPCs", c.npcs.length], ["lore", "Lore", (c.lore = c.lore || []).length], ["quests", "Quests", c.quests.length], ["loot", "Loot", c.loot.length], ["notes", "Notes"], ["maps", "Maps", (c.maps || []).length], ["calendar", "Calendar"], ["sources", "Sourcebooks"], ["handouts", "Handouts"]];
  let h = `<div class="card">
    <div class="row camp-title-row" style="align-items:flex-start"><input class="title-input" type="text" data-field="name" value="${esc(c.name)}" aria-label="Campaign name">
      <div style="flex:0 0 auto;display:flex;gap:6px"><button class="btn sm" id="exportCamp">Export campaign</button><button class="btn sm danger" id="delCamp">Delete</button></div></div>
    <div class="row" style="margin-top:10px;gap:14px;flex-wrap:wrap">
      <div style="flex:0 0 auto" class="row"><span class="lbl" style="margin:0">Party level</span><input type="number" min="1" max="20" data-field="currentLevel" value="${c.currentLevel || 1}" style="width:70px"></div>
      <div style="flex:1;min-width:200px"><div class="row" style="justify-content:space-between;font-size:14px" ><span class="muted">Story progress</span><span><b id="pctTxt">${pct}%</b> <span class="muted">(${done}/${tot} ${c.gen && c.gen.outline.kind === "oneshot" ? "scenes" : "chapters"})</span></span></div><div class="progress"><div id="pctBar" style="width:${pct}%"></div></div></div>
    </div>
    <div class="stats"><span><b>${c.sessions.length}</b> sessions played</span><span><b>${active}</b> active quests</span><span><b>${c.party.length}</b> heroes</span><span><b>${c.npcs.length}</b> NPCs</span></div>
    <div class="subtabs">${tabs.map(([k, l, n]) => `<button data-sub="${k}" class="${subTab === k ? "on" : ""}">${l}${n !== undefined ? `<span class="n">${n}</span>` : ""}</button>`).join("")}</div>
    <div id="subBody">${renderSub(c)}</div></div>`;
  if (subTab === "overview" && c.gen) h += `<div style="margin-top:6px">${renderAdventure(c.gen, { rerolls: false })}</div>`;
  main.innerHTML = h;
  $$("textarea.ch-note", main).forEach(autoGrow);
  fightBarSync();
}
const SESSION_TYPES = { encounters: "Encounter", maps: "Map", npcs: "NPC", loot: "Loot", handouts: "Handout" };
function sessionEntries(c, type) {
  return type === "handouts" ? journalHandouts(c) : (c[type] || []);
}
function sessionQueue(c) {
  return Array.isArray(c.sessionQueue) ? c.sessionQueue.filter(x => x && typeof x.id === "string" && (x.type === "compendium" || Object.hasOwn(SESSION_TYPES, x.type))) : [];
}
function sessionName(entry) {
  return entry?.name || entry?.title || entry?.item || "Untitled";
}
function enqueueSession(c, entry) {
  const queue = sessionQueue(c);
  if (queue.some(x => x.type === entry.type && x.ref === entry.ref)) { toast("Already in Next Session"); return; }
  c.sessionQueue = [...queue, { ...entry, id: uid("queue") }];
  Store.save(c);
  toast("Added to Next Session");
}
function sessionQueueButton(type, entry) {
  return `<button class="btn sm" type="button" data-session-add="${type}" data-id="${esc(entry.id)}" aria-label="Queue ${esc(sessionName(entry))} for next session">+ Next Session</button>`;
}
function nextSessionHTML(c) {
  const queue = sessionQueue(c);
  const options = Object.entries(SESSION_TYPES).map(([type, label]) =>
    `<optgroup label="${label}">${sessionEntries(c, type).map(entry =>
      `<option value="${esc(type + "|" + entry.id)}">${esc(sessionName(entry))}</option>`).join("")}</optgroup>`).join("");
  return `<section class="card next-session"><h3>Next Session</h3>
    <form id="nextSessionForm" class="row">
      <select name="entry" required aria-label="Campaign entry to queue"><option value="">Choose a campaign entry…</option>${options}</select>
      <button class="btn sm" type="submit">Add to queue</button>
    </form>
    ${queue.length ? `<ol class="plain">${queue.map((entry, index) => {
      const linked = entry.type === "compendium" ? entry : sessionEntries(c, entry.type).find(x => x.id === entry.ref);
      const title = sessionName(linked || entry);
      return `<li><div class="row"><span><b>${esc(title)}</b> <small class="muted">${esc(entry.type === "compendium" ? entry.kind : SESSION_TYPES[entry.type])}</small></span>
        ${linked ? `<button class="btn sm" type="button" data-session-queue="open" data-id="${esc(entry.id)}">Open</button>` : '<span class="muted">Entry removed</span>'}
        <button class="btn sm" type="button" data-session-queue="up" data-id="${esc(entry.id)}" aria-label="Move ${esc(title)} up" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="btn sm" type="button" data-session-queue="down" data-id="${esc(entry.id)}" aria-label="Move ${esc(title)} down" ${index === queue.length - 1 ? "disabled" : ""}>↓</button>
        <button class="btn sm" type="button" data-session-queue="remove" data-id="${esc(entry.id)}" aria-label="Remove ${esc(title)} from queue">Remove</button>
      </div></li>`;
    }).join("")}</ol>` : '<p class="muted">The queue is empty.</p>'}</section>`;
}
function openSessionEntry(c, entry) {
  if (entry.type === "compendium") {
    compendium.sessionEntry = entry;
    $("#compendiumEdition").value = entry.ed;
    $("#compendiumType").value = entry.kind;
    $("#compendiumQuery").value = entry.name;
    location.hash = "compendium";
    return;
  }
  const linked = sessionEntries(c, entry.type).find(x => x.id === entry.ref);
  if (!linked) return;
  if (entry.type === "maps") { mapOpenSaved(linked); return; }
  if (entry.type === "npcs") {
    worldAdopt();
    TN.tab = npcPlaceTabs(c.npcs, linked.placeId).cur;
  }
  subTab = entry.type;
  renderTracker();
  const target = entry.type === "encounters" ? document.getElementById("enc-" + linked.id)
    : Array.from(campMain.querySelectorAll("[data-session-add]")).find(button => button.dataset.id === linked.id)?.closest(".item, details");
  if (target?.tagName === "DETAILS") target.open = true;
  target?.scrollIntoView({ block: "start" });
  target?.querySelector("input, summary, button")?.focus({ preventScroll: true });
}
function sessionDashboardHTML(c) {
  const recap = [...c.sessions].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || (+b.num || 0) - (+a.num || 0))[0];
  const encounters = (c.encounters || []).filter(e => e.status === "Active");
  const pins = c.sessionPins || {};
  const map = (c.maps || []).find(m => m.id === pins.maps);
  const npc = c.npcs.find(n => n.id === pins.npcs);
  const lore = (c.lore || []).find(l => l.id === pins.lore);
  const picker = (key, label, entries, selected) => `<label>${label}<select data-session-pin="${key}">
    <option value="">Choose…</option>${entries.map(x => `<option value="${esc(x.id)}" ${x === selected ? "selected" : ""}>${esc(x.name || "Untitled")}</option>`).join("")}
    </select></label>`;
  return `${nextSessionHTML(c)}<div class="session-dashboard">
    <section class="card"><h3>Active encounters</h3>
      ${encounters.length ? encounters.map(e => `<p><b>${esc(e.name || "Encounter")}</b>${e.round ? ` · Round ${esc(e.round)}` : ""}
        <button type="button" class="btn sm" data-resume-encounter="${esc(e.id)}">Resume encounter</button></p>`).join("") : '<p class="muted">No active encounters.</p><button type="button" class="btn sm" data-sub="encounters">Open Encounters</button>'}
    </section>
    <section class="card"><h3>Latest recap</h3>
      ${recap ? `<details><summary>${esc(recap.title || "Session recap")}</summary>${mdHTML(recap.summary)}</details>` : '<p class="muted">No sessions logged yet.</p>'}
      <button type="button" class="btn sm" data-sub="sessions">Open Sessions</button>
    </section>
    <section class="card"><h3>Pinned map</h3>
      ${picker("maps", "Campaign map", c.maps || [], map)}
      ${map ? `<button type="button" class="btn sm" data-openmap="${esc(map.id)}">Open map</button>` : '<button type="button" class="btn sm" data-sub="maps">Open Maps</button>'}
    </section>
    <section class="card"><h3>Pinned references</h3>
      ${picker("npcs", "NPC", c.npcs, npc)}
      ${npc ? `<details><summary>${esc(npc.name || "NPC")}</summary><p>${esc(npc.role || "")}</p>${mdHTML(npc.notes)}</details>` : ""}
      ${picker("lore", "Lore entry", c.lore || [], lore)}
      ${lore ? `<details><summary>${esc(lore.name || "Lore entry")}</summary>${mdHTML(lore.desc)}
        ${(lore.sections || []).map(x => `<h4>${esc(x.t || "")}</h4>${mdHTML(x.x)}`).join("")}</details>` : ""}
    </section>
  </div>`;
}
function renderSub(c) {
  if (subTab === "sources") return campaignSourcesHTML(c);
  if (subTab === "handouts") return campaignHandoutsHTML(c);
  if (subTab === "session") return sessionDashboardHTML(c);
  if (subTab === "encounters") return renderEncounters(c);
  if (subTab === "lore") return loreHTML(c);
  if (subTab === "calendar") return calHTML(c);
  if (subTab === "overview") {
    return `<div class="sec-h"><h3>${c.gen && c.gen.outline.kind === "oneshot" ? "Scenes" : "Chapters"}</h3><span class="sp"></span><button class="btn sm" data-add="chapters">+ Add</button></div>
      ${c.chapters.length ? c.chapters.map(ch => `<div class="chapter ${ch.done ? "done" : ""}"><input type="checkbox" data-list="chapters" data-id="${ch.id}" data-key="done" ${ch.done ? "checked" : ""} aria-label="Completed"><div class="body"><input type="text" class="ch-title" data-list="chapters" data-id="${ch.id}" data-key="title" value="${esc(ch.title)}" placeholder="Chapter title" style="font-weight:600"><textarea data-list="chapters" data-id="${ch.id}" data-key="note" placeholder="Notes for this chapter" class="ch-note" style="min-height:90px;margin-top:6px">${esc(ch.note)}</textarea><button class="btn sm" type="button" data-goenc="${ch.id}" style="margin-top:6px">⚔ Encounters (${(c.encounters || []).filter(x => x.chId === ch.id).length})</button></div><button class="icon-btn" data-del="chapters" data-id="${ch.id}" title="Remove">✕</button></div>`).join("") : `<p class="muted">Add chapters or story beats and tick them off as the party completes them.</p>`}
      ${c.gen ? `<p class="hint">The generated adventure is below for reference.</p>` : ""}`;
  }
  if (subTab === "notes") {
    return `<div class="field"><label>Campaign notes</label><textarea data-field="notes" style="min-height:220px" placeholder="World lore, house rules, running threads…">${esc(c.notes)}</textarea></div>
      <div class="field"><label>DM secrets (keep off-screen)</label><textarea data-field="secrets" style="min-height:120px" placeholder="Twists, hidden motives, what's really behind the door…">${esc(c.secrets)}</textarea></div>`;
  }
  if (subTab === "maps") {
    const ms = c.maps || [];
    return ms.length ? ms.map(m => `<div class="item"><div class="item-h"><b style="flex:1">${esc(m.name)}</b><span class="muted" style="font-size:14px">${m.kind === "image" ? "Imported map" : m.kind === "drawn" ? "Drawn map" : `${esc(m.theme)} · ${esc(m.size)}`} · Lv ${m.level}${m.fog ? " · fog saved" : ""}</span>${sessionQueueButton("maps", m)}<button class="btn sm" data-openmap="${m.id}">Open</button><button class="icon-btn" data-del="maps" data-id="${m.id}" title="Remove">✕</button></div></div>`).join("")
      : `<p class="muted">No maps yet. Generate one on the Dungeon Map tab and press “Save”. Saved maps redraw exactly the same every time.</p>`;
  }
  const L = LISTS[subTab]; let items = c[subTab], tabsHTML = "";
  if (subTab === "npcs") { worldAdopt(); const T = npcPlaceTabs(items, TN.tab); TN.tab = T.cur; if (items.length) tabsHTML = T.html("tntab"); items = items.filter(T.keep); }
  return (subTab === "sessions" ? recapBarHTML() : "") + `<div class="sec-h"><h3>${L.label}</h3><span class="sp"></span>${subTab === "loot" ? `<button class="btn sm" type="button" data-hoardopen="1" title="Roll coins, gems, art and magic items for this campaign's level">💰 Roll a hoard</button>` : ""}<button class="btn sm primary" data-add="${subTab}">+ ${L.add}</button></div>` + tabsHTML +
    (subTab === "loot" && HOARD.T && HOARD.T.camp === c.id ? `<div class="card hoard" style="margin:0 0 12px">${hoardHTML(HOARD.T, "tracker")}</div>` : "") +
    (items.length ? items.map(it => `<div class="item${subTab === "npcs" ? " npc-row" : ""}">` + (subTab === "npcs" ? npcPicHTML(it) + `<div class="npc-body">` : "") + (() => {
      const [first, ...rest] = L.fields; const inline = rest.filter(f => f[1] !== "textarea"), areas = rest.filter(f => f[1] === "textarea");
      return `<div class="item-h">${fieldHTML(subTab, it, first)}${subTab === "loot" ? lootGiveHTML(c, it) : ""}${["npcs", "loot"].includes(subTab) ? sessionQueueButton(subTab, it) : ""}<button class="icon-btn" data-del="${subTab}" data-id="${it.id}" title="Delete">✕</button></div>
        ${inline.length ? `<div class="row" style="margin-top:6px">${inline.map(f => fieldHTML(subTab, it, f)).join("")}${subTab === "npcs" ? `<select class="npc-move" data-npcplace="${esc(it.id)}" aria-label="Place for ${esc(it.name || "this NPC")}" title="Place">${wpOptionsHTML(it.placeId, "📍 Place…")}</select>` : ""}</div>` : ""}
        ${areas.map(f => fieldHTML(subTab, it, f)).join("")}`;
    })() + (subTab === "npcs" ? `</div>` : "") + `</div>`).join("") : `<p class="muted">Nothing here yet.</p>`);
}
// hand a loot item to one of your characters: party members first, then anyone on My Characters
function lootGiveHTML(camp, it) {
  const inParty = new Set((camp.party || []).map(p => p.pcId).filter(Boolean)), L = [...PCS.roster].sort((a, b) => inParty.has(b.id) - inParty.has(a.id));
  if (!L.length) return "";
  return `<select class="loot-give" data-lootgive="${esc(it.id)}" aria-label="Give ${esc(it.item || "item")} to a character"><option value="">${it.givenTo ? `Given to ${esc(it.givenTo)}` : "Give to…"}</option>${L.map(p => `<option value="${esc(p.id)}">${esc(p.name)}${inParty.has(p.id) ? "" : " (not in party)"}</option>`).join("")}</select>`;
}
document.addEventListener("change", e => {
  const t = e.target; if (!t.dataset || !t.dataset.lootgive || !t.value) return;
  const camp = Store.get(activeId), it = camp && (camp.loot || []).find(x => x.id === t.dataset.lootgive), p = PCS.roster.find(x => x.id === t.value);
  if (!it || !p) return;
  itLoad(); const ref = (it.ref && itFind(it.ref)) || [...itCustomList(), ...IT.data[edOf(p)]].find(x => x.n.toLowerCase() === String(it.item || "").toLowerCase());
  p.inv = p.inv || [];
  const ex = p.inv.find(i => i.n.toLowerCase() === String(it.item || "").toLowerCase());
  if (ex) ex.qty = (+ex.qty || 1) + 1;
  else p.inv.push({ id: uid("i"), ref: ref ? ref.id : it.ref, itemRules: it.itemRules || inventoryRulesSnapshot(ref), n: it.item || "Loot", qty: 1, w: ref ? ref.w || 0 : 0, att: !!(ref && ref.att), attuned: false, value: it.value || (ref ? ref.c : ""), note: String(it.notes || "").slice(0, 120) });
  it.holder = p.name; it.givenTo = p.name; Store.save(camp); pcPersist();
  toast(`${it.item || "Loot"} given to ${p.name}`); renderTracker();
});
function fieldHTML(list, it, [key, type, ph, opts]) {
  const a = `data-list="${list}" data-id="${it.id}" data-key="${key}" aria-label="${esc(ph)}"`;
  if (type === "textarea") return `<textarea ${a} placeholder="${esc(ph)}" style="margin-top:6px">${esc(it[key])}</textarea>`;
  if (type === "select") return `<select ${a}>${opts.map(o => `<option ${it[key] === o ? "selected" : ""}>${o}</option>`).join("")}</select>`;
  return `<input type="${type}" ${a} placeholder="${esc(ph)}" value="${esc(it[key] ?? "")}" ${type === "number" ? 'min="0" max="99"' : ""}>`;
}
/* ======================= NPC pictures =======================
   An uploaded picture lives in this browser's picture store (MAPIMG, key "npc-<id>", at most 2048 px) and the NPC keeps
   img: that key. A link is kept as imgUrl (https only). Show on TV sends only the picture, as a handout. */
const NPC_PIC_MAX = 2048, npcPicUrls = [];
const npcUrlOk = u => /^https:\/\/\S+$/i.test(String(u || ""));
function npcPicHTML(it) {
  const id = esc(it.id), url = !it.img && npcUrlOk(it.imgUrl) ? it.imgUrl : "", has = !!(it.img || url);
  const pic = it.img ? `<img alt="Picture of ${esc(it.name || "this NPC")}" data-npcimg="${esc(it.img)}">` : url ? `<img alt="Picture of ${esc(it.name || "this NPC")}" src="${esc(url)}" referrerpolicy="no-referrer">` : `<span class="npc-pic-empty">No picture</span>`;
  clearTimeout(npcPicFill._t); npcPicFill._t = setTimeout(npcPicFill);
  return `<div class="npc-pic"><div class="npc-frame">${pic}</div><div class="npc-pic-btns">
    <button class="btn sm" type="button" data-npcpic="add" data-id="${id}" title="Add a picture from this computer">🖼 ${has ? "Change" : "Add picture…"}</button>
    <button class="btn sm" type="button" data-npcpic="link" data-id="${id}" title="Use a picture link (https://…)">🔗 Link</button>
    ${has ? `<button class="btn sm" type="button" data-npcpic="tv" data-id="${id}" title="Show this picture on the TV">📺 TV</button>
    <button class="icon-btn" type="button" data-npcpic="clear" data-id="${id}" title="Remove the picture">✕</button>` : ""}</div></div>`;
}
async function npcPicFill() {
  npcPicUrls.splice(0).forEach(u => URL.revokeObjectURL(u));
  for (const im of $$("img[data-npcimg]", campMain)) {
    let blob = null; try { blob = await MAPIMG.get(im.dataset.npcimg); } catch { }
    if (!im.isConnected) continue;
    if (blob) { const u = URL.createObjectURL(blob); npcPicUrls.push(u); im.src = u; }
    else im.replaceWith(Object.assign(document.createElement("span"), { className: "npc-pic-empty", textContent: "Picture not on this device" }));
  }
}
const npcOf = id => { const c = curCamp(); return c && (c.npcs || []).find(n => n.id === id); };
async function npcPicSet(id, file) {
  let cv; try { ({ cv } = await loadImageCanvas(file)); } catch { toast("Couldn't open that picture. Try a PNG or JPG."); return; }
  const k = Math.min(1, NPC_PIC_MAX / Math.max(cv.width, cv.height));
  if (k < 1) { const s = document.createElement("canvas"); s.width = Math.round(cv.width * k); s.height = Math.round(cv.height * k); s.getContext("2d").drawImage(cv, 0, 0, s.width, s.height); cv = s; }
  const c = curCamp(), n = npcOf(id); if (!n) return;
  const key = "npc-" + n.id;
  try { await MAPIMG.put(key, await canvasBlob(cv)); } catch { toast("Couldn't store that picture in this browser"); return; }
  const old = n.img; n.img = key; delete n.imgUrl; Store.save(c); npcSync(n);
  if (old && old !== key && !npcImgUsed(old)) { try { await MAPIMG.del(old); } catch { } }
  renderTracker();
}
async function npcPicLink(id) {
  const n = npcOf(id); if (!n) return;
  const v = prompt("Picture link (starts with https://)", n.imgUrl || ""); if (v === null) return;
  const url = v.trim(); if (!npcUrlOk(url)) { toast("Use a picture link that starts with https://"); return; }
  const old = n.img; delete n.img;
  n.imgUrl = url; Store.save(curCamp()); npcSync(n);
  if (old && !npcImgUsed(old)) { try { await MAPIMG.del(old); } catch { } }
  renderTracker();
}
async function npcPicClear(id) {
  const n = npcOf(id); if (!n) return;
  const old = n.img;
  delete n.img; delete n.imgUrl; Store.save(curCamp()); npcSync(n);
  if (old && !npcImgUsed(old)) { try { await MAPIMG.del(old); } catch { } }
  renderTracker();
}
async function npcPicTV(id) {
  const n = npcOf(id); if (!n || !(n.img || npcUrlOk(n.imgUrl))) return;
  // open the TV window straight from the click, before any waiting, so pop-up blockers allow it
  hostEnsure();
  if (!HOST.on) return;
  let blob = null;
  if (n.img) { try { blob = await MAPIMG.get(n.img); } catch { } if (!blob) { toast("This picture isn't on this device. Add it again with 🖼 Add picture."); return; } }
  else if (npcUrlOk(n.imgUrl)) {
    try { const r = await fetch(n.imgUrl, { mode: "cors" }); if (!r.ok) throw 0; blob = await r.blob(); }
    catch { toast("That website doesn't let the Forge copy its picture. Download it and use 🖼 Add picture instead."); return; }
  } else return;
  let cv; try { ({ cv } = await loadImageCanvas(blob)); } catch { toast("Couldn't open that picture. Try a PNG or JPG."); return; }
  handoutShow(cv);
}
$("#npcPicFile").addEventListener("change", e => { const f = e.target.files[0], id = e.target.dataset.id; e.target.value = ""; if (f && id) npcPicSet(id, f); });
function curCamp() { return Store.get(activeId); }
function updateProgress(c) {
  const done = c.chapters.filter(x => x.done).length, tot = c.chapters.length, pct = tot ? Math.round(done / tot * 100) : 0;
  const b = $("#pctBar"), t = $("#pctTxt"); if (b) b.style.width = pct + "%"; if (t) t.textContent = pct + "%";
}
$("#campList").addEventListener("click", e => { const b = e.target.closest("[data-camp]"); if (b) { activeId = b.dataset.camp; subTab = "overview"; renderTracker(); } });
$("#newCamp").addEventListener("click", () => { const c = blankCampaign(); Store.save(c); activeId = c.id; subTab = "overview"; renderTracker(); });
$("#importFile").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  let j = null; try { j = JSON.parse(await f.text()); } catch { }
  if (j && j.format === "mythweaver-account-export") { await dmLoadExtraMonsters(); const R = mwRead(j); if (R.error) toast(R.error); else impCampOpen(R); return; }
  try {
    const c = j;
    if (!c || typeof c !== "object" || !c.name) throw 0;
    const { extras, pictures, ...camp } = c;
    const base = blankCampaign(); const merged = { ...base, ...camp, id: uid("c") };
    ["chapters", "encounters", "sessions", "party", "npcs", "lore", "quests", "loot", "maps"].forEach(k => { if (!Array.isArray(merged[k])) merged[k] = []; });
    const restored = await restoreCampaignPictures(merged, pictures);
    Store.save(merged); activeId = merged.id; renderTracker();
    const got = await campExtrasAdopt(extras); worldAdopt();
    if (restored) got.push(`${restored} uploaded picture${restored === 1 ? "" : "s"}`);
    toast(got.length ? `Campaign imported, with ${got.join(", ")}` : "Campaign imported");
  } catch { toast("That file isn't a Forge campaign export"); }
});
/* Custom things a campaign file carries along (extras): custom items, homebrew and custom monsters.
   Export adds them; import adds the ones this browser doesn't have yet (same id, or same name and text, counts as having it). */
function campExtras(c) {
  const ids = new Set([...(c ? c.lore || [] : []).map(l => l.wpId), ...(c ? c.npcs || [] : []).map(n => n.placeId)].filter(id => id && wp(id)));
  [...ids].forEach(id => wpPath(wp(id)).forEach(x => ids.add(x.id)));
  const world = W.places.filter(p => ids.has(p.id));
  return { items: IT.custom.map(({ hay, hayD, ...x }) => x), homebrew: HB.list.slice(), monsters: MB.lib.slice(), world, ...(W.atlas && world.some(p => p.type === "region" && !p.parent) ? { worldMap: W.atlas } : {}) };
}
function campaignPictureRefs(c) {
  const refs = [];
  const add = (record, field) => {
    const key = record?.[field];
    if (typeof key === "string" && key) refs.push({ record, field, key });
  };
  for (const map of c.maps || []) if (map?.kind === "image") add(map, "imgId");
  for (const npc of c.npcs || []) add(npc, "img");
  return refs;
}
async function exportCampaign(c, button) {
  button.disabled = true;
  try {
    const snapshot = JSON.parse(JSON.stringify({ ...c, extras: campExtras(c) }));
    const keys = new Set(campaignPictureRefs(snapshot).map(ref => ref.key));
    const pictures = Object.create(null);
    let missing = 0;
    for (const key of keys) {
      const image = await MAPIMG.get(key);
      if (image) pictures[key] = await blobToDataURL(image);
      else missing++;
    }
    const filename = c.name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "Campaign";
    await saveFile(filename + ".json", JSON.stringify({ ...snapshot, pictures }, null, 2));
    if (missing) toast(`Exported campaign. ${missing} uploaded picture${missing === 1 ? " was" : "s were"} unavailable on this device.`);
  } catch { toast("Couldn't export the campaign. Try again."); }
  finally { button.disabled = false; }
}
async function restoreCampaignPictures(c, pictures) {
  if (!pictures || typeof pictures !== "object") return 0;
  const refs = campaignPictureRefs(c), stored = new Map();
  try {
    for (const { key } of refs) {
      if (stored.has(key) || !Object.hasOwn(pictures, key)) continue;
      const data = pictures[key];
      if (typeof data !== "string" || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Error("Invalid campaign picture");
      const id = uid("picture"), blob = await (await fetch(data)).blob();
      await MAPIMG.put(id, blob);
      stored.set(key, id);
    }
  } catch (error) {
    await Promise.allSettled([...stored.values()].map(id => MAPIMG.del(id)));
    throw error;
  }
  for (const { record, field, key } of refs) if (stored.has(key)) record[field] = stored.get(key);
  return stored.size;
}
async function campExtrasAdopt(ex) {
  const out = [], plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if (!ex || typeof ex !== "object") return out;
  const lc = v => String(v || "").trim().toLowerCase();
  // custom items -> Items tab (custom), ready to Give or Buy
  let ni = 0;
  (Array.isArray(ex.items) ? ex.items : []).forEach(x => {
    if (!x || !x.n) return;
    const was = x.mwId ? IT.custom.findIndex(y => y.mwId === x.mwId) : -1;
    if (was >= 0) { const { hay, hayD, ...rec } = x; rec.id = IT.custom[was].id; if (rec.draft) rec.draft.id = rec.id; if (JSON.stringify(rec) !== JSON.stringify((({ hay, hayD, ...y }) => y)(IT.custom[was]))) { IT.custom[was] = rec; ni++; } return; }
    if (IT.custom.some(y => y.id === x.id || (lc(y.n) === lc(x.n) && String(y.d || "") === String(x.d || "")))) return;
    const { hay, hayD, ...rec } = x;
    if (!rec.id || /^20(14|24)-/.test(rec.id)) rec.id = uid("ci");
    rec.kind = "custom"; if (rec.draft) rec.draft.id = rec.id;
    IT.custom.push(rec); ni++;
  });
  if (ni) { itPersist(); if (location.hash === "#items") renderItems(); out.push(plural(ni, "custom item")); }
  // homebrew -> Homebrew tab (only the DM can add it when signed in)
  const hbList = (Array.isArray(ex.homebrew) ? ex.homebrew : []).filter(x => x && HB_KINDS[x.kind] && x.name
    && !HB.list.some(y => y.id === x.id || (y.kind === x.kind && lc(y.name) === lc(x.name) && (x.kind !== "subclass" || y.cls === x.cls))));
  if (hbList.length && !(hbCloud() && !Portal.isDM())) {
    let nh = 0;
    for (const x of hbList) { if (await hbPut({ ...x })) nh++; }
    if (nh) out.push(plural(nh, "homebrew entry").replace("entrys", "entries"));
  }
  // custom monsters -> Monster Manual, My monsters
  let nm = 0;
  (Array.isArray(ex.monsters) ? ex.monsters : []).forEach(f => {
    if (!f || !f.name || MB.lib.some(y => y.id === f.id || (f.mwId && y.mwId === f.mwId) || lc(y.name) === lc(f.name))) return;
    MB.lib.push({ ...f, id: f.id || uid("mm") }); nm++;
  });
  if (nm && mbSaveLib()) { bsCustomRefresh(); if (MB.f) mbRenderLib(); out.push(plural(nm, "custom monster")); }
  // World places (with their parents): same id or same name counts as having it
  if (Array.isArray(ex.world) && ex.world.length) {
    if (!W.loaded) worldLoad();
    const map = {}, add = [];
    ex.world.forEach(x => { if (!x || !x.id || !x.name) return; const had = wp(x.id) || W.places.find(y => lc(y.name) === lc(x.name)); if (had) map[x.id] = had.id; else { add.push({ ...x }); map[x.id] = x.id; } });
    const repin = a => a && a.pins ? { ...a, pins: Object.fromEntries(Object.entries(a.pins).map(([k, v]) => [map[k] || k, v])) } : a; // pins follow places that matched by name
    add.forEach(x => { x.parent = x.parent ? map[x.parent] || null : null; if (x.atlas) x.atlas = repin(x.atlas); W.places.push(x); });
    const wmap = !W.atlas && ex.worldMap && ex.worldMap.seed;
    if (wmap) { W.atlas = repin(ex.worldMap); out.push("the World map"); }
    if (add.length || wmap) { worldSave(); if (add.length) out.push(plural(add.length, "World place")); }
  }
  return out;
}
const campMain = $("#campMain");
const TN = { tab: "" }; /* the Tracker NPCs tab's place tab */
campMain.addEventListener("click", e => { const t = e.target.closest("[data-tntab]"); if (!t) return; TN.tab = t.dataset.tntab; renderTracker(); const nb = campMain.querySelector(`[data-tntab="${CSS.escape(TN.tab)}"]`); if (nb) nb.focus(); });
campMain.addEventListener("change", e => {
  const t = e.target; if (!t.dataset || !t.dataset.npcplace) return;
  const c = curCamp(), n = c && (c.npcs || []).find(x => x.id === t.dataset.npcplace); if (!n) return;
  const pl = wpPick(t.value, n.name); if (pl === null) { renderTracker(); return; }
  if (pl) { n.placeId = pl.id; n.place = pl.name; } else { delete n.placeId; delete n.place; }
  Store.save(c); npcSync(n); renderTracker(); toast(pl ? `${n.name || "NPC"} moved to ${pl.name}` : `${n.name || "NPC"} has no place now`);
  const sel = campMain.querySelector(`[data-npcplace="${CSS.escape(n.id)}"]`); if (sel) sel.focus();
});

/* ======================= Lore (a Campaign Tracker tab) =======================
   c.lore = [{id, mwId?, name, type, tags[], imgUrl?, desc, sections:[{t, x, dm}], src?}]. Text is shown through mdHTML,
   which escapes everything first and then turns a small set of markdown into formatting. */
const LORE_TYPES = { place: "Places", item: "Items", monster: "Monsters", encounter: "Encounters", other: "Other" };
const LORE_ONE = { place: "Place", item: "Item", monster: "Monster", encounter: "Encounter", other: "Other" };
const LORE = { q: "", type: "", open: new Set(), edit: null, draft: null };
function mdInline(s) { return s.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>"); }
function mdHTML(text) {
  const lines = esc(String(text || "")).replace(/\r/g, "").split("\n"), out = []; let list = null, para = [];
  const flushP = () => { if (para.length) { out.push(`<p>${para.map(mdInline).join("<br>")}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`<${list.t}>${list.items.map(i => `<li>${mdInline(i)}</li>`).join("")}</${list.t}>`); list = null; } };
  for (const raw of lines) {
    const l = raw.trim(), h = l.match(/^(#{1,3})\s+(.*)$/), ul = l.match(/^[-*•]\s+(.*)$/), ol = l.match(/^\d+[.)]\s+(.*)$/);
    if (!l) { flushP(); flushL(); continue; }
    if (h) { flushP(); flushL(); out.push(`<h${h[1].length + 3} class="md-h">${mdInline(h[2])}</h${h[1].length + 3}>`); continue; }
    if (ul || ol) { flushP(); const t = ul ? "ul" : "ol"; if (!list || list.t !== t) { flushL(); list = { t, items: [] }; } list.items.push((ul || ol)[1]); continue; }
    flushL(); para.push(l);
  }
  flushP(); flushL();
  return out.join("");
}
const loreNew = () => ({ id: uid("lo"), name: "", type: "place", tags: [], desc: "", sections: [] });
const loreHay = x => [x.name, (x.tags || []).join(" "), x.desc, ...(x.sections || []).flatMap(s => [s.t, s.x])].join(" ").toLowerCase();
function loreFormHTML(d) {
  return `<div class="lore-form">
    <div class="field row"><div style="flex:2"><label>Name</label><input type="text" maxlength="120" data-lf="name" value="${esc(d.name)}"></div>
      <div><label>Type</label><select data-lf="type">${Object.entries(LORE_ONE).map(([k, l]) => `<option value="${k}" ${d.type === k ? "selected" : ""}>${l}</option>`).join("")}</select></div></div>
    <div class="field row"><div><label>Tags (comma separated)</label><input type="text" maxlength="300" data-lf="tags" value="${esc((d.tags || []).join(", "))}"></div>
      <div><label>Picture link (https, optional)</label><input type="url" maxlength="500" data-lf="imgUrl" value="${esc(d.imgUrl || "")}" placeholder="https://…"></div></div>
    <div class="field"><label>Description</label><textarea maxlength="8000" data-lf="desc">${esc(d.desc)}</textarea></div>
    <label class="check"><input type="checkbox" data-lshare ${d.shared ? "checked" : ""}><span>Players see this in their Journal (the description and every section not marked DM only)</span></label>
    ${(d.sections || []).map((s, i) => `<div class="lore-sec-edit"><div class="row"><input type="text" maxlength="120" data-ls="t" data-i="${i}" value="${esc(s.t)}" placeholder="Section title" aria-label="Section title">
      <label class="check" style="flex:0 0 auto;margin:0"><input type="checkbox" data-ls="dm" data-i="${i}" ${s.dm ? "checked" : ""}><span>DM only</span></label>
      <button class="icon-btn" type="button" data-lore="secdel" data-i="${i}" title="Remove section" aria-label="Remove section">✕</button></div>
      <textarea maxlength="12000" data-ls="x" data-i="${i}" placeholder="Text (you can use **bold**, *italic*, # headings and - lists)">${esc(s.x)}</textarea></div>`).join("")}
    <button class="btn sm" type="button" data-lore="secadd">+ Add section</button>
    <div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px"><button class="btn" type="button" data-lore="cancel" style="flex:0 0 auto">Cancel</button><button class="btn primary" type="button" data-lore="save" style="flex:0 0 auto">Save</button></div>
  </div>`;
}
function loreHTML(c) {
  const L = c.lore || [], q = LORE.q.trim().toLowerCase();
  const n = k => L.filter(x => !k || x.type === k).length;
  const shown = L.filter(x => (!LORE.type || x.type === LORE.type) && (!q || loreHay(x).includes(q)));
  const card = x => {
    const open = LORE.open.has(x.id), editing = LORE.edit === x.id, pic = npcUrlOk(x.imgUrl) ? x.imgUrl : "";
    return `<div class="lore-card ${open || editing ? "open" : ""}" data-id="${esc(x.id)}">
      <div class="lore-head">${pic ? `<img class="lore-pic" src="${esc(pic)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : ""}
        <button class="lore-open" type="button" data-lore="open" data-id="${esc(x.id)}" aria-expanded="${open}"><span class="lore-name">${esc(x.name || "Untitled")}</span>
          <small class="muted">${LORE_ONE[x.type] || "Other"}${(x.tags || []).length ? " · " + esc(x.tags.join(", ")) : ""}${x.shared ? " · 👥 Players see this" : ""}</small></button>
        ${pic ? `<button class="btn sm" type="button" data-lore="tv" data-id="${esc(x.id)}" title="Show the picture on the TV">📺 TV</button>` : ""}
        <button class="btn sm" type="button" data-lore="edit" data-id="${esc(x.id)}">Edit</button>
        <button class="icon-btn" type="button" data-lore="del" data-id="${esc(x.id)}" title="Delete" aria-label="Delete ${esc(x.name || "entry")}">✕</button></div>
      ${editing ? loreFormHTML(LORE.draft) : open ? `<div class="lore-body">${x.desc ? `<div class="lore-desc">${mdHTML(x.desc)}</div>` : ""}
        ${(x.sections || []).map(s => `<div class="lore-sec"><h4>${esc(s.t || "")}${s.dm ? ` <span class="tag lore-dm" title="Only for you">🔒 DM only</span>` : ""}</h4>${mdHTML(s.x)}</div>`).join("")}
        ${!x.desc && !(x.sections || []).length ? `<p class="muted">Nothing written yet.</p>` : ""}</div>` : ""}
    </div>`;
  };
  return `<div class="sec-h"><h3>Lore</h3><span class="sp"></span><button class="btn sm primary" type="button" data-lore="add">+ Add entry</button></div>
    <div class="lore-tools"><input type="search" id="loreQ" autocomplete="off" placeholder="Search names, tags and text…" value="${esc(LORE.q)}" aria-label="Search lore">
      <div class="lore-chips">${[["", "All"], ...Object.entries(LORE_TYPES)].map(([k, l]) => `<button type="button" class="chip ${LORE.type === k ? "on" : ""}" data-lt="${k}">${l} <span class="n">${n(k)}</span></button>`).join("")}</div></div>
    ${LORE.edit === "new" ? `<div class="lore-newbox">${loreFormHTML(LORE.draft)}</div>` : ""}
    <div class="lore-list">${shown.length ? shown.map(card).join("") : `<p class="muted">${L.length ? "Nothing matches." : "No lore yet. Add places, items, monsters and notes, or import a MythWeaver campaign."}</p>`}</div>`;
}
/* Saving a Lore Item, Monster or Encounter also puts it where it's used (Places go to the World, above):
   items -> Items → Custom, monsters -> Monster Manual → My monsters, encounters -> this campaign's Encounters tab.
   The made record carries loreId, so editing the entry again updates it. Saving an item in the Items tab's builder marks it
   loreOff, so from then on the Lore leaves it alone; a monster keeps its numbers once it has stats (only its name and text
   follow the Lore); an encounter's monsters are only filled in while it has none. Something with the same name that the
   Lore didn't make (or a built-in item) is left alone. Returns lines for a toast. */
function loreLink(c, l) {
  const lc = v => String(v || "").trim().toLowerCase(), out = [];
  try {
    if (l.type === "item") {
      itLoad();
      const i = IT.custom.findIndex(y => y.loreId === l.id), d = loreItemDraft(l, "A treasure from the campaign's Lore.");
      if (i >= 0 && IT.custom[i].loreOff) { /* changed in the Items builder since: leave it */ }
      else if (i >= 0) {
        const old = IT.custom[i], { hay, hayD, ...rest } = old, rec = { ...rest, ...ciRecord({ ...d, id: old.id }), loreId: l.id };
        if (JSON.stringify(rec) !== JSON.stringify(rest)) { IT.custom[i] = rec; itPersist(); out.push(`Updated “${rec.n}” in Items`); }
      } else if (!IT.custom.some(y => lc(y.n) === lc(d.n)) && !Object.values(IT.data).flat().some(y => lc(y.n) === lc(d.n))) {
        const rec = { ...ciRecord(d), loreId: l.id }; IT.custom.push(rec); itPersist(); out.push(`Added “${rec.n}” to Items → Custom`);
      }
      if (out.length && location.hash === "#items") renderItems();
    } else if (l.type === "monster") {
      const f = loreMonster(l), had = MB.lib.find(y => y.loreId === l.id);
      if (had) {
        const nf = had.needsStats ? { ...f, id: had.id } : { ...had, name: f.name, desc: f.desc };
        nf.loreId = l.id;
        if (JSON.stringify(nf) !== JSON.stringify(had)) { Object.keys(had).forEach(k => delete had[k]); Object.assign(had, nf); if (mbSaveLib()) { bsCustomRefresh(); if (MB.f) mbRenderLib(); out.push(`Updated “${f.name}” in My monsters`); } }
      } else if (!MB.lib.some(y => lc(y.name) === lc(f.name))) {
        f.loreId = l.id; MB.lib.push(f);
        if (mbSaveLib()) { bsCustomRefresh(); if (MB.f) mbRenderLib(); out.push(`Added “${f.name}” to My monsters${f.needsStats ? " (it needs stats)" : ""}`); }
      }
    } else if (l.type === "encounter") {
      c.encounters = c.encounters || [];
      const e = mwEncounter(l, c, mwMonsterIndex(), "Made from the Lore entry"), had = c.encounters.find(y => y.loreId === l.id);
      if (had) {
        const before = JSON.stringify(had); had.name = e.name; had.notes = e.notes; if (!(had.enemies || []).length) had.enemies = e.enemies;
        if (JSON.stringify(had) !== before) { Store.save(c); out.push(`Updated “${e.name}” on the Encounters tab`); }
      } else if (!c.encounters.some(y => lc(y.name) === lc(e.name))) {
        e.loreId = l.id; c.encounters.push(e); Store.save(c); out.push(`Added “${e.name}” to the Encounters tab`);
        const n = campMain.querySelector('[data-sub="encounters"] .n'); if (n) n.textContent = c.encounters.length;
      }
    }
  } catch (err) { console.error(err); out.push("Saved, but it couldn't be added to its tab"); }
  return out;
}
function loreRender() {
  const box = document.getElementById("subBody"), q = document.getElementById("loreQ"), had = q && document.activeElement === q, pos = had ? q.selectionStart : 0;
  const c = curCamp(); if (!box || !c) return;
  box.innerHTML = loreHTML(c);
  const tab = campMain.querySelector('[data-sub="lore"] .n'); if (tab) tab.textContent = (c.lore || []).length;
  if (had) { const n = document.getElementById("loreQ"); n.focus(); n.setSelectionRange(pos, pos); }
  campMain.querySelectorAll(".lore-form textarea").forEach(autoGrow);
}
async function loreTV(x) {
  if (!npcUrlOk(x.imgUrl)) return;
  hostEnsure();
  if (!HOST.on) return;
  let blob; try { const r = await fetch(x.imgUrl, { mode: "cors" }); if (!r.ok) throw 0; blob = await r.blob(); }
  catch { toast("That website doesn't let the Forge copy its picture. Download it and show it with 🖼 Show a picture on the Dungeon Map tab."); return; }
  let cv; try { ({ cv } = await loadImageCanvas(blob)); } catch { toast("Couldn't open that picture."); return; }
  handoutShow(cv);
}
campMain.addEventListener("click", async e => {
  const b = e.target.closest("[data-lore],[data-lt]"); if (!b || !campMain.contains(b)) return;
  const c = curCamp(); if (!c) return; c.lore = c.lore || [];
  if (b.dataset.lt !== undefined) { LORE.type = b.dataset.lt; loreRender(); return; }
  const a = b.dataset.lore, id = b.dataset.id, x = id && c.lore.find(y => y.id === id);
  if (a === "open" && x) { LORE.open.has(id) ? LORE.open.delete(id) : LORE.open.add(id); loreRender(); }
  else if (a === "add") { LORE.edit = "new"; LORE.draft = loreNew(); loreRender(); const n = campMain.querySelector('[data-lf="name"]'); if (n) n.focus(); }
  else if (a === "edit" && x) { LORE.edit = id; LORE.draft = JSON.parse(JSON.stringify(x)); LORE.draft.sections = LORE.draft.sections || []; loreRender(); }
  else if (a === "cancel") { LORE.edit = null; LORE.draft = null; loreRender(); }
  else if (a === "secadd" && LORE.draft) { LORE.draft.sections.push({ t: "", x: "", dm: false }); loreRender(); }
  else if (a === "secdel" && LORE.draft) { LORE.draft.sections.splice(+b.dataset.i, 1); loreRender(); }
  else if (a === "save" && LORE.draft) {
    const d = LORE.draft, url = String(d.imgUrl || "").trim();
    if (url && !npcUrlOk(url)) { toast("Use a picture link that starts with https://"); return; }
    const clean = { ...d, name: String(d.name || "").trim().slice(0, 120) || "Untitled", type: LORE_ONE[d.type] ? d.type : "other", tags: (Array.isArray(d.tags) ? d.tags : String(d.tags || "").split(",")).map(t => String(t).trim()).filter(Boolean).slice(0, 30),
      imgUrl: url || undefined, desc: String(d.desc || ""), shared: !!d.shared || undefined, sections: (d.sections || []).filter(s => String(s.t || "").trim() || String(s.x || "").trim()).map(s => ({ t: String(s.t || "").trim(), x: String(s.x || ""), dm: !!s.dm })) };
    const i = c.lore.findIndex(y => y.id === clean.id); if (i >= 0) c.lore[i] = clean; else c.lore.unshift(clean);
    LORE.edit = null; LORE.draft = null; LORE.open.add(clean.id); Store.save(c);
    if (clean.type === "place" || d.wpId) { worldAdopt(); const p = clean.type === "place" && wp(clean.wpId); if (p) { WP_LORE.forEach(k => { if (clean[k] === undefined) delete p[k]; else p[k] = JSON.parse(JSON.stringify(clean[k])); }); worldSave(); wpSyncOut(p); } }
    if (clean.type === "encounter" && !extraMonstersReady) {
      loreRender();
      await dmLoadExtraMonsters();
      if (Store.get(c.id) !== c || !c.lore.includes(clean)) return;
    }
    const made = loreLink(c, clean); if (made.length) toast(made.join(" · "));
    if (curCamp()?.id === c.id && subTab === "lore") loreRender();
  }
  else if (a === "del" && x) { if (!(await confirmBox("Delete lore entry?", `Remove “${x.name || "Untitled"}”? This can't be undone.`))) return; c.lore = c.lore.filter(y => y.id !== id); Store.save(c); loreRender(); }
  else if (a === "tv" && x) loreTV(x);
});
campMain.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "loreQ") { LORE.q = t.value; clearTimeout(loreRender._t); loreRender._t = setTimeout(loreRender, 150); return; }
  const d = LORE.draft; if (!d) return;
  if (t.dataset.lf) d[t.dataset.lf] = t.dataset.lf === "tags" ? t.value.split(",") : t.value;
  else if (t.dataset.ls && t.dataset.ls !== "dm") d.sections[+t.dataset.i][t.dataset.ls] = t.value;
  if (t.tagName === "TEXTAREA") autoGrow(t);
});
campMain.addEventListener("change", e => {
  const t = e.target, d = LORE.draft; if (!d) return;
  if (t.dataset.lf === "type") d.type = t.value;
  else if (t.dataset.ls === "dm") d.sections[+t.dataset.i].dm = t.checked;
  else if (t.dataset.lshare !== undefined) d.shared = t.checked;
});

/* ======================= Session recaps =======================
   recapMake(c) gathers what's happened since the last recap: finished fights (with XP), quests completed or failed,
   chapters done, loot handed out, and the calendar's log. mark() flags them so the next recap only has what's new. */
function recapMake(c) {
  const since = c.recapAt || 0, cal = c.cal || null;
  const fights = (c.encounters || []).filter(e => (e.status === "Done" || e.xpAwarded) && !e.recapped);
  const quests = (c.quests || []).filter(q => (q.status === "Completed" || q.status === "Failed") && q.recappedAs !== q.status);
  const loot = (c.loot || []).filter(l => l.givenTo && !l.recapped);
  const chapters = (c.chapters || []).filter(ch => ch.done && !ch.recapped);
  const log = cal ? cal.log.filter(e => (e.at || 0) > since).slice().reverse() : [];
  const foes = e => { const n = {}; e.enemies.forEach(m => { n[m.stat] = (n[m.stat] || 0) + 1; }); return Object.entries(n).map(([k, v]) => v > 1 ? `${v} × ${k}` : k).join(", ") || "no enemies listed"; };
  const out = [], from = c.recapDay || 1;
  if (cal) out.push(`Session recap — ${from === cal.day ? `Day ${cal.day}` : `Day ${from} to Day ${cal.day}`} (${cap1(calSeason(cal))})`); else out.push("Session recap");
  const sec = (title, lines) => { if (lines.length) out.push("", title, ...lines.map(l => "• " + l)); };
  sec("Fights", fights.map(e => { const M = encMath(c, e); return `${e.name}: ${foes(e)}${e.xpAwarded && M.raw ? ` (${M.raw.toLocaleString()} XP shared by the party)` : ""}`; }));
  sec("Quests", quests.map(q => `${q.status === "Completed" ? "Completed" : "Failed"}: ${q.title}${q.giver ? ` (for ${q.giver})` : ""}`));
  sec("Story", chapters.map(ch => `Finished ${ch.title}`));
  sec("Loot", loot.map(l => `${l.givenTo} took ${l.item}${l.value ? ` (${l.value})` : ""}`));
  sec("Along the way", log.map(e => `Day ${e.day}, ${calTime(e.min)}: ${e.text}`));
  return {
    text: out.join("\n"), empty: !(fights.length || quests.length || loot.length || chapters.length || log.length),
    mark() { fights.forEach(e => e.recapped = true); quests.forEach(q => q.recappedAs = q.status); loot.forEach(l => l.recapped = true); chapters.forEach(ch => ch.recapped = true); c.recapAt = Date.now(); if (cal) c.recapDay = cal.day; }
  };
}
function recapWrite(c) {
  const r = recapMake(c); if (r.empty) { toast("Nothing new since the last recap. Finish a fight, a quest or some travel first."); return; }
  const num = Math.max(0, ...c.sessions.map(s => +s.num || 0)) + 1, t = new Date(), ymd = [t.getFullYear(), t.getMonth() + 1, t.getDate()].map(x => String(x).padStart(2, "0")).join("-");
  c.sessions.unshift({ id: uid("s"), title: `Session ${num}`, num, date: ymd, summary: r.text });
  r.mark(); Store.save(c); renderTracker(); toast(`Session ${num} logged with a recap. Edit it as you like.`);
}
function recapBarHTML() {
  return `<div class="card rand-enc"><div class="row" style="align-items:center;gap:10px;flex-wrap:wrap"><b style="font-family:Cinzel,serif">📝 Session recap</b><span class="muted" style="font-size:14px;flex:1;min-width:220px">Collects the fights finished, XP, quests, chapters, loot handed out and the calendar's log since the last recap into a new session you can edit.</span><button class="btn sm primary" type="button" id="recapBtn" style="flex:0 0 auto">Write a recap</button></div></div>`;
}
campMain.addEventListener("click", ev => { if (ev.target.id === "recapBtn") { const c = curCamp(); if (c) recapWrite(c); } });
/* ======================= Calendar and weather =======================
   c.cal = {day, min (minutes since midnight), climate, season (the season on day 1), weather, log: [{day, min, text, at}]}.
   Weather follows the usual d20 tables (temperature, wind, precipitation), seeded by campaign and day so a day's weather never changes. */
const CAL_SEASONS = ["spring", "summer", "autumn", "winter"];
const CAL_CLIMATES = { temperate: ["Temperate", [55, 75, 55, 30]], cold: ["Cold (north, mountains)", [35, 50, 30, 5]], hot: ["Hot (desert, south)", [85, 100, 85, 70]], wet: ["Wet (jungle, coast)", [75, 82, 75, 68]] };
function calEnsure(c) { if (!c.cal) c.cal = { day: 1, min: 8 * 60, climate: "temperate", season: "spring", weather: null, log: [] }; if (!c.cal.weather) c.cal.weather = calWeather(c.id, c.cal.day, c.cal.climate, calSeason(c.cal)); return c.cal; }
function calSeason(cal) { return CAL_SEASONS[(CAL_SEASONS.indexOf(cal.season || "spring") + Math.floor((cal.day - 1) / 91)) % 4]; }
function calTime(min) {
  const h = Math.floor(min / 60) % 24, m = min % 60, part = h < 5 ? "Night" : h < 7 ? "Dawn" : h < 12 ? "Morning" : h < 14 ? "Midday" : h < 18 ? "Afternoon" : h < 21 ? "Evening" : "Night";
  return `${part}, ${h}:${String(m).padStart(2, "0")}`;
}
function calWeather(seed, day, climate, season) {
  const r = makeRng("weather", seed, day, climate), base = (CAL_CLIMATES[climate] || CAL_CLIMATES.temperate)[1][CAL_SEASONS.indexOf(season)] ?? 55;
  const tr = r.int(1, 20), f = base + (tr >= 18 ? r.int(1, 4) * 10 : tr >= 15 ? -r.int(1, 4) * 10 : r.int(-5, 5));
  const wr = r.int(1, 20), wind = wr >= 18 ? "strong" : wr >= 13 ? "light" : "none";
  const pr = r.int(1, 20) + (climate === "wet" ? 3 : climate === "hot" ? -4 : 0), precip = pr >= 18 ? "heavy" : pr >= 13 ? "light" : "none";
  const snow = f <= 32, c = Math.round((f - 32) * 5 / 9);
  const tempWord = f <= 0 ? "Bitterly cold" : f <= 32 ? "Freezing" : f <= 50 ? "Cold" : f <= 65 ? "Cool" : f <= 80 ? "Mild" : f < 100 ? "Hot" : "Scorching";
  const sky = precip === "none" ? (wind === "strong" ? "windswept and clear" : r.chance(.5) ? "clear skies" : "clouds") : `${precip === "heavy" ? "heavy" : "light"} ${snow ? "snow" : "rain"}`;
  const effects = [];
  if (wind === "strong") effects.push("Strong wind: disadvantage on ranged weapon attacks and on Perception checks that rely on hearing; open flames go out; flying creatures must land at the end of their turn or fall.");
  if (precip === "heavy") effects.push(`Heavy ${snow ? "snow" : "rain"}: everything is lightly obscured, with disadvantage on Perception checks that rely on sight; open flames go out.`);
  if (f <= 0) effects.push("Extreme cold: each hour outside, a DC 10 Constitution save or gain a level of exhaustion, unless dressed for the cold or resistant to cold.");
  if (f >= 100) effects.push("Extreme heat: each hour without water, a Constitution save (DC 5, +1 for each further hour) or gain a level of exhaustion; medium or heavy armour gives disadvantage.");
  const icon = precip !== "none" ? (snow ? "❄️" : "🌧") : wind === "strong" ? "💨" : f >= 90 ? "🔥" : sky === "clouds" ? "☁️" : "☀️";
  return { day, f, sky: sky + (wind === "strong" ? ", strong wind" : ""), text: `${icon} ${tempWord} (${f}°F / ${c}°C), ${sky}${wind === "light" ? ", a light breeze" : wind === "strong" ? ", strong wind" : ""}`, effects };
}
function calLog(cal, text) { cal.log.unshift({ day: cal.day, min: cal.min, text, at: Date.now() }); if (cal.log.length > 200) cal.log.length = 200; }
function calAdvance(c, minutes, note) {
  const cal = calEnsure(c); cal.min += minutes;
  while (cal.min >= 1440) { cal.min -= 1440; cal.day++; cal.weather = calWeather(c.id, cal.day, cal.climate, calSeason(cal)); }
  if (note) calLog(cal, note);
}
function calHTML(c) {
  const cal = calEnsure(c), w = cal.weather;
  return `<div class="cal-now" id="calNow"><div class="cal-day">Day ${cal.day}<span>${cap1(calSeason(cal))} · ${calTime(cal.min)}</span></div><div class="cal-wx">${esc(w.text)}${w.effects.length ? `<ul>${w.effects.map(e => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}</div></div>
    <div class="row cal-btns"><button class="btn sm" type="button" data-cal="10m">+10 min</button><button class="btn sm" type="button" data-cal="1h">+1 hour</button><button class="btn sm" type="button" data-cal="short">Short rest (1 h)</button><button class="btn sm" type="button" data-cal="long">Long rest (8 h)</button><button class="btn sm" type="button" data-cal="morning">Next morning</button>
      <span class="cal-travel"><input type="number" id="calTravel" min="1" max="60" value="1" aria-label="Days to travel"><button class="btn sm primary" type="button" data-cal="travel">Travel days</button></span></div>
    <div class="field row" style="margin-top:12px">
      <div><label>Climate</label><select id="calClimate">${Object.entries(CAL_CLIMATES).map(([k, v]) => `<option value="${k}" ${k === cal.climate ? "selected" : ""}>${v[0]}</option>`).join("")}</select></div>
      <div><label>Season on day 1</label><select id="calSeason">${CAL_SEASONS.map(k => `<option value="${k}" ${k === cal.season ? "selected" : ""}>${cap1(k)}</option>`).join("")}</select></div>
      <div><label>Day</label><input type="number" id="calDay" min="1" value="${cal.day}"></div>
      <div style="flex:0 0 auto;align-self:end"><button class="btn sm" type="button" data-cal="reroll" title="Roll today's weather again">🎲 New weather</button></div>
    </div>
    <div class="field"><label>Log</label><div class="row"><input type="text" id="calNote" placeholder="Note what happened, e.g. Met the ferryman"><button class="btn sm" type="button" data-cal="note" style="flex:0 0 auto">Add</button></div></div>
    ${cal.log.length ? `<ul class="cal-log">${cal.log.slice(0, 30).map(e => `<li><span class="muted">Day ${e.day}, ${esc(calTime(e.min))}</span> ${esc(e.text)}</li>`).join("")}</ul>` : `<p class="muted">Nothing logged yet. Rests, travel and your notes appear here, and go into session recaps.</p>`}`;
}
campMain.addEventListener("click", ev => {
  const b = ev.target.closest("[data-cal]"); if (!b) return; const c = curCamp(); if (!c) return; const cal = calEnsure(c), a = b.dataset.cal;
  if (a === "10m") calAdvance(c, 10);
  else if (a === "1h") calAdvance(c, 60);
  else if (a === "short") calAdvance(c, 60, "Short rest");
  else if (a === "long") calAdvance(c, 480, "Long rest");
  else if (a === "morning") calAdvance(c, ((24 * 60 - cal.min) + 8 * 60) % 1440 || 1440, "Slept until morning");
  else if (a === "travel") {
    const n = clamp(parseInt($("#calTravel").value) || 1, 1, 60), skies = [];
    for (let i = 0; i < n; i++) { calAdvance(c, 1440); skies.push(cal.weather.sky); }
    calLog(cal, `Travelled ${n} day${n > 1 ? "s" : ""} (${[...new Set(skies)].slice(0, 4).join("; ")})`);
  } else if (a === "reroll") { cal.weather = calWeather(c.id + "|" + Date.now(), cal.day, cal.climate, calSeason(cal)); cal.weather.day = cal.day; }
  else if (a === "note") { const t = $("#calNote").value.trim(); if (!t) return; calLog(cal, t.slice(0, 200)); }
  Store.save(c); renderTracker();
});
campMain.addEventListener("change", ev => {
  const key = ev.target.dataset.sessionPin;
  if (["maps", "npcs", "lore"].includes(key)) {
    const c = curCamp();
    if (!c) return;
    const selected = (c[key] || []).find(x => x.id === ev.target.value);
    c.sessionPins = { ...c.sessionPins, [key]: selected?.id || "" };
    Store.save(c);
    renderTracker();
    campMain.querySelector(`[data-session-pin="${key}"]`)?.focus();
    return;
  }
  const id = ev.target.id; if (!["calClimate", "calSeason", "calDay"].includes(id)) return; const c = curCamp(); if (!c) return; const cal = calEnsure(c);
  if (id === "calClimate") cal.climate = ev.target.value; else if (id === "calSeason") cal.season = ev.target.value; else cal.day = Math.max(1, parseInt(ev.target.value) || 1);
  cal.weather = calWeather(c.id, cal.day, cal.climate, calSeason(cal)); Store.save(c); renderTracker();
});
campMain.addEventListener("submit", event => {
  if (event.target.id !== "nextSessionForm") return;
  event.preventDefault();
  const c = curCamp(), [type, ...parts] = event.target.elements.entry.value.split("|");
  if (!c || !Object.hasOwn(SESSION_TYPES, type)) return;
  const entry = sessionEntries(c, type).find(x => x.id === parts.join("|"));
  if (entry) { enqueueSession(c, { type, ref: entry.id, name: sessionName(entry) }); renderTracker(); }
});
campMain.addEventListener("click", async e => {
  const c = curCamp(); if (!c) return;
  const t = e.target;
  const add = t.closest("[data-session-add]");
  if (add && Object.hasOwn(SESSION_TYPES, add.dataset.sessionAdd)) {
    const type = add.dataset.sessionAdd;
    const entry = sessionEntries(c, type).find(x => x.id === add.dataset.id);
    if (entry) enqueueSession(c, { type, ref: entry.id, name: sessionName(entry) });
    return;
  }
  const queueButton = t.closest("[data-session-queue]");
  if (queueButton) {
    const queue = sessionQueue(c), index = queue.findIndex(x => x.id === queueButton.dataset.id);
    if (index < 0) return;
    const action = queueButton.dataset.sessionQueue;
    if (action === "open") { openSessionEntry(c, queue[index]); return; }
    if (action === "remove") queue.splice(index, 1);
    else {
      const other = index + (action === "up" ? -1 : 1);
      if (other < 0 || other >= queue.length) return;
      [queue[index], queue[other]] = [queue[other], queue[index]];
    }
    c.sessionQueue = queue; Store.save(c); renderTracker();
    const moved = campMain.querySelector(`[data-session-queue="${action}"][data-id="${CSS.escape(queueButton.dataset.id)}"]:enabled`);
    (moved || $("#nextSessionForm select"))?.focus();
    return;
  }
  const sb = t.closest("[data-sub]"); if (sb) { subTab = sb.dataset.sub; renderTracker(); return; }
  const resume = t.closest("[data-resume-encounter]");
  if (resume) {
    subTab = "encounters";
    renderTracker();
    const encounter = document.getElementById("enc-" + resume.dataset.resumeEncounter);
    encounter?.scrollIntoView({ block: "start" });
    encounter?.querySelector("input")?.focus({ preventScroll: true });
    return;
  }
  const ad = t.closest("[data-add]");
  if (ad) {
    const k = ad.dataset.add; const it = { id: uid(k[0]) };
    if (k === "chapters") Object.assign(it, { title: "", done: false, note: "" });
    else LISTS[k].fields.forEach(([key, type, , opts]) => it[key] = type === "select" ? opts[0] : "");
    if (k === "sessions") { it.num = (c.sessions.reduce((m, s) => Math.max(m, +s.num || 0), 0) + 1); it.date = new Date().toISOString().slice(0, 10); it.title = `Session ${it.num}`; }
    if (k === "party") it.level = c.currentLevel || 1;
    if (k === "npcs" && TN.tab && wp(TN.tab)) { it.placeId = TN.tab; it.place = wp(TN.tab).name; }
    if (k === "chapters") c.chapters.push(it); else c[k].unshift(it);
    Store.save(c); renderTracker();
    const first = campMain.querySelector(`[data-id="${it.id}"][data-key]:not([type=checkbox])`); if (first) first.focus();
    return;
  }
  const dl = t.closest("[data-del]");
  if (dl) {
    const k = dl.dataset.del, id = dl.dataset.id;
    const it = (c[k] || []).find(x => x.id === id);
    const label = it && (it.name || it.title || it.item) ? `“${it.name || it.title || it.item}”` : "this entry";
    if (!(await confirmBox("Delete entry?", `Remove ${label}? This can't be undone.`))) return;
    c[k] = c[k].filter(x => x.id !== id); Store.save(c);
    if (k === "npcs" && it && it.img && !npcImgUsed(it.img)) { try { await MAPIMG.del(it.img); } catch { } }
    renderTracker(); return;
  }
  const np = t.closest("[data-npcpic]");
  if (np) {
    const a = np.dataset.npcpic, id = np.dataset.id;
    if (a === "add") { const f = $("#npcPicFile"); f.dataset.id = id; f.click(); }
    else if (a === "link") npcPicLink(id); else if (a === "clear") npcPicClear(id); else if (a === "tv") npcPicTV(id);
    return;
  }
  const om = t.closest("[data-openmap]");
  if (om) { const m = (c.maps || []).find(x => x.id === om.dataset.openmap); if (m) mapOpenSaved(m); return; }
  const mk = t.closest("[data-mkmap]");
  if (mk && c.gen) { openMapForLocation(c.gen, +mk.dataset.mkmap); return; }
  if (t.id === "delCamp") {
    if (!(await confirmBox("Delete campaign?", `Permanently delete “${c.name}” and all of its notes?`))) return;
    await Store.remove(c.id); activeId = null; renderTracker(); toast("Campaign deleted"); return;
  }
  if (t.id === "exportCamp") await exportCampaign(c, t);
});
function onEdit(e) {
  const c = curCamp(); if (!c) return; const t = e.target;
  if (t.dataset.field) {
    let v = t.value; if (t.dataset.field === "currentLevel") v = clamp(parseInt(v) || 1, 1, 20);
    c[t.dataset.field] = v; Store.save(c);
    if (t.dataset.field === "name" || t.dataset.field === "currentLevel") renderCampList();
    return;
  }
  if (t.dataset.list) {
    const it = c[t.dataset.list].find(x => x.id === t.dataset.id); if (!it) return;
    if (t.classList.contains("ch-note")) autoGrow(t);
    it[t.dataset.key] = t.type === "checkbox" ? t.checked : t.type === "number" ? (t.value === "" ? "" : +t.value) : t.value;
    Store.save(c);
    if (t.dataset.list === "npcs") npcSync(it);
    if (t.dataset.key === "done") { t.closest(".chapter").classList.toggle("done", t.checked); updateProgress(c); renderCampList(); }
  }
}
campMain.addEventListener("input", onEdit);

/* ======================= Encounter tracker ======================= */
// SRD 5.1 quick stats: [AC, HP, hit dice, initiative mod, speed, attacks, traits, role]
/* a foe's initiative bonus: the hand-written table first, then its stat block in the rules data (QA-1, 2026-11-24: random
   encounters and most monsters got +0) */
function foeInit(stat) {
  const t = MSTAT[stat]; if (t) return +t[3] || 0;
  const d = dmData("monsterData"), m = (d["2014"] || []).find(x => x.n === stat) || (d["2024"] || []).find(x => x.n === stat);
  return !m ? 0 : m.init !== undefined && m.init !== null && m.init !== "" ? +m.init || 0 : mod(+(m.scores || [])[1] || 10);
}
const MSTAT = {
  "Kobold": [12, 5, "2d6-2", 2, "30 ft", "Dagger +4 (1d4+2 piercing); Sling +4, 30/120 ft (1d4+2 bludgeoning)", "Pack Tactics; Sunlight Sensitivity", "pack"],
  "Giant rat": [12, 7, "2d6", 2, "30 ft", "Bite +4 (1d4+2 piercing)", "Pack Tactics; Keen Smell", "pack"],
  "Bandit": [12, 11, "2d8+2", 1, "30 ft", "Scimitar +3 (1d6+1 slashing); Light crossbow +3, 80/320 ft (1d8+1 piercing)", "None", "skirmisher"],
  "Cultist": [12, 9, "2d8", 1, "30 ft", "Scimitar +3 (1d6+1 slashing)", "Dark Devotion (advantage on saves vs. charmed and frightened)", "minion"],
  "Goblin": [15, 7, "2d6", 2, "30 ft", "Scimitar +4 (1d6+2 slashing); Shortbow +4, 80/320 ft (1d6+2 piercing)", "Nimble Escape (Disengage or Hide as a bonus action)", "skirmisher"],
  "Skeleton": [13, 13, "2d8+4", 2, "30 ft", "Shortsword +4 (1d6+2 piercing); Shortbow +4, 80/320 ft (1d6+2 piercing)", "Vulnerable to bludgeoning; immune to poison", "mindless"],
  "Zombie": [8, 22, "3d8+9", -2, "20 ft", "Slam +3 (1d6+1 bludgeoning)", "Undead Fortitude (DC 5 + damage Con save to drop to 1 HP instead of 0, not vs. radiant or crits)", "mindless"],
  "Wolf": [13, 11, "2d8+2", 2, "40 ft", "Bite +4 (2d4+2 piercing; DC 11 Str save or knocked prone)", "Pack Tactics; Keen Hearing and Smell", "pack"],
  "Giant bat": [13, 22, "4d10", 3, "10 ft, fly 60 ft", "Bite +4 (1d6+2 piercing)", "Echolocation (blindsight 60 ft); Keen Hearing", "flier"],
  "Swarm of rats": [10, 24, "7d8-7", 0, "30 ft", "Bites +2, reach 0 ft (2d6 piercing, or 1d6 at half HP or less)", "Swarm (occupies other creatures' spaces, can't regain HP); resists bludgeoning, piercing, slashing", "swarm"],
  "Pseudodragon": [13, 7, "2d4+2", 2, "15 ft, fly 60 ft", "Bite +4 (1d4+2 piercing); Sting +4 (1d4+2 piercing; DC 11 Con save or poisoned 1 hour, unconscious if failed by 5+)", "Magic Resistance; Limited Telepathy", "flier"],
  "Orc": [13, 15, "2d8+6", 1, "30 ft", "Greataxe +5 (1d12+3 slashing); Javelin +5, 30/120 ft (1d6+3 piercing)", "Aggressive (bonus action: move up to its speed toward an enemy)", "brute"],
  "Hobgoblin": [18, 11, "2d8+2", 1, "30 ft", "Longsword +3 (1d8+1 slashing); Longbow +3, 150/600 ft (1d8+1 piercing)", "Martial Advantage (+2d6 once per turn if an ally is within 5 ft of the target)", "soldier"],
  "Gnoll": [15, 22, "5d8", 1, "30 ft", "Bite +4 (1d4+2 piercing); Spear +4 (1d6+2 piercing); Longbow +3 (1d8+1 piercing)", "Rampage (after dropping a creature to 0 HP, bonus action move half speed and bite)", "brute"],
  "Shadow": [12, 16, "3d8+3", 2, "40 ft", "Strength Drain +4 (2d6+2 necrotic; target's Str drops by 1d4, dies at 0 Str)", "Amorphous; Shadow Stealth (Hide as bonus action in dim light/darkness); Sunlight Weakness; resists most nonmagical damage", "ambusher"],
  "Gray ooze": [8, 22, "3d8+9", -2, "10 ft, climb 10 ft", "Pseudopod +3 (1d6+1 bludgeoning + 2d6 acid; nonmagical metal armor takes -1 AC)", "Amorphous; Corrode Metal (metal weapons that hit it corrode); False Appearance", "ooze"],
  "Thug": [11, 32, "5d8+10", 0, "30 ft", "Multiattack: 2 Mace +4 (1d6+2 bludgeoning); Heavy crossbow +2, 100/400 ft (1d10 piercing)", "Pack Tactics", "brute"],
  "Ghoul": [12, 22, "5d8", 2, "30 ft", "Bite +2 (2d6+2 piercing); Claws +4 (2d4+2 slashing; DC 10 Con save or paralyzed 1 minute, elves immune)", "Immune to charm, poison, exhaustion", "pack"],
  "Bugbear": [16, 27, "5d8+5", 2, "30 ft", "Morningstar +4 (2d8+2 piercing); Javelin +4 (2d6+2 melee / 1d6+2 thrown)", "Brute (extra weapon die, included); Surprise Attack (+2d6 vs. surprised creature in round 1)", "ambusher"],
  "Giant spider": [14, 26, "4d10+4", 3, "30 ft, climb 30 ft", "Bite +5 (1d8+3 piercing + DC 11 Con save, 2d8 poison, half on success); Web (Recharge 5–6) +5, 30/60 ft (restrained, DC 12 Str to escape)", "Spider Climb; Web Sense; Web Walker", "ambusher"],
  "Animated armor": [18, 33, "6d8+6", 0, "25 ft", "Multiattack: 2 Slam +4 (1d6+2 bludgeoning)", "Antimagic Susceptibility; False Appearance; immune to poison and psychic", "mindless"],
  "Specter": [12, 22, "5d8", 2, "fly 50 ft (hover)", "Life Drain +4 (3d6 necrotic; DC 10 Con save or max HP reduced by the damage)", "Incorporeal Movement; Sunlight Sensitivity; resists most nonmagical damage", "ambusher"],
  "Dire wolf": [14, 37, "5d10+10", 2, "50 ft", "Bite +5 (2d6+3 piercing; DC 13 Str save or knocked prone)", "Pack Tactics; Keen Hearing and Smell", "pack"],
  "Harpy": [11, 38, "7d8+7", 1, "20 ft, fly 40 ft", "Multiattack: Claws +3 (2d4+1 slashing) and Club +3 (1d4+1 bludgeoning)", "Luring Song (DC 11 Wis save or charmed and must move toward the harpy)", "controller"],
  "Spy": [12, 27, "6d8", 2, "30 ft", "Multiattack: 2 Shortsword +4 (1d6+2 piercing); Hand crossbow +4, 30/120 ft (1d6+2 piercing)", "Cunning Action; Sneak Attack (+2d6 once per turn)", "skirmisher"],
  "Ogre": [11, 59, "7d10+21", -1, "40 ft", "Greatclub +6 (2d8+4 bludgeoning); Javelin +6, 30/120 ft (2d6+4 piercing)", "None", "brute"],
  "Gargoyle": [15, 52, "7d8+21", 0, "30 ft, fly 60 ft", "Multiattack: Bite +4 (1d6+2 piercing) and Claws +4 (1d6+2 slashing)", "False Appearance (looks like a statue); resists nonmagical weapons", "ambusher"],
  "Gelatinous cube": [6, 84, "8d10+40", -4, "15 ft", "Pseudopod +4 (3d6 acid); Engulf (DC 12 Dex save or engulfed: 3d6 acid now and each turn, restrained, can't breathe)", "Ooze Cube; Transparent (DC 15 Perception to spot when motionless)", "ooze"],
  "Cult fanatic": [13, 33, "6d8+6", 2, "30 ft", "Multiattack: 2 Dagger +4 (1d4+2 piercing). Spells (DC 11, +3): hold person, spiritual weapon, command, inflict wounds, shield of faith, sacred flame", "Dark Devotion", "caster"],
  "Priest": [13, 27, "5d8+5", 0, "25 ft", "Mace +2 (1d6 bludgeoning). Spells (DC 13, +5): spirit guardians, guiding bolt, cure wounds, spiritual weapon, sacred flame, lesser restoration", "Divine Eminence (bonus action: +3d6 radiant on a melee hit by spending a slot)", "caster"],
  "Ghast": [13, 36, "8d8", 3, "30 ft", "Bite +3 (2d8+1 piercing); Claws +5 (2d6+3 slashing; DC 10 Con save or paralyzed 1 minute)", "Stench (DC 10 Con save or poisoned within 5 ft); Turning Defiance", "pack"],
  "Wererat": [12, 33, "6d8+6", 2, "30 ft", "Multiattack: 2 attacks. Shortsword +4 (1d6+2 piercing); Hand crossbow +4 (1d6+2); Bite (rat or hybrid form) +4 (1d4+2, DC 11 Con save or cursed with lycanthropy)", "Shapechanger; immune to nonmagical, non-silvered weapons", "skirmisher"],
  "Bandit captain": [15, 65, "10d8+20", 3, "30 ft", "Multiattack: 2 Scimitar +5 (1d6+3 slashing) and Dagger +5 (1d4+3 piercing)", "Parry (reaction: +2 AC against one melee attack)", "leader"],
  "Mimic": [12, 58, "9d8+18", 1, "15 ft", "Pseudopod +5 (1d8+3 bludgeoning; adhered/grappled, DC 13); Bite +5 (1d8+3 piercing + 1d8 acid)", "Shapechanger; Adhesive; False Appearance; Grappler (advantage vs. creatures grappled by it)", "ambusher"],
  "Wight": [14, 45, "6d8+18", 2, "30 ft", "Multiattack: 2 Longsword +4 (1d8+2 slashing), or 1 Life Drain +4 (1d6+2 necrotic, DC 13 Con or max HP reduced); Longbow +4 (1d8+2)", "Sunlight Sensitivity; resists nonmagical weapons; can raise slain humanoids as zombies", "leader"],
  "Owlbear": [13, 59, "7d10+21", 1, "40 ft", "Multiattack: Beak +7 (1d10+5 piercing) and Claws +7 (2d8+5 slashing)", "Keen Sight and Smell", "brute"],
  "Knight": [18, 52, "8d8+16", 0, "30 ft", "Multiattack: 2 Greatsword +5 (2d6+3 slashing); Heavy crossbow +2 (1d10 piercing)", "Brave; Leadership (1/short rest: allies within 30 ft add 1d4 to attacks and saves for 1 minute); Parry (+2 AC)", "leader"],
  "Veteran": [17, 58, "9d8+18", 1, "30 ft", "Multiattack: 2 Longsword +5 (1d8+3 slashing) and Shortsword +5 (1d6+3 piercing); Heavy crossbow +3 (1d10+1)", "None", "soldier"],
  "Basilisk": [15, 52, "8d8+16", -1, "20 ft", "Bite +5 (2d6+3 piercing + 2d6 poison)", "Petrifying Gaze (DC 12 Con save: restrained, then petrified; averting eyes gives disadvantage on attacks)", "controller"],
  "Hell hound": [15, 45, "7d8+14", 1, "50 ft", "Bite +5 (1d8+3 piercing + 2d6 fire); Fire Breath (Recharge 5–6): 15-ft cone, DC 12 Dex save, 6d6 fire", "Pack Tactics; Keen Hearing and Smell; immune to fire", "pack"],
  "Mummy": [11, 58, "9d8+18", -1, "20 ft", "Multiattack: Dreadful Glare and Rotting Fist +5 (2d6+3 bludgeoning + 3d6 necrotic; DC 12 Con save or mummy rot curse)", "Dreadful Glare (DC 11 Wis save or frightened; fail by 5+ also paralyzed); vulnerable to fire", "brute"],
  "Banshee": [12, 58, "13d8", 2, "fly 40 ft (hover)", "Corrupting Touch +4 (3d6+2 necrotic); Horrifying Visage (DC 13 Wis save or frightened); Wail (1/day, DC 13 Con save or drop to 0 HP, 3d6 psychic on success)", "Incorporeal Movement; Detect Life; resists most nonmagical damage", "controller"],
  "Black pudding": [7, 85, "10d10+30", -3, "20 ft, climb 20 ft", "Pseudopod +5 (1d6+3 bludgeoning + 4d8 acid; corrodes nonmagical armor)", "Amorphous; Corrosive Form; Spider Climb; Split (lightning or slashing damage splits it if it has 10+ HP)", "ooze"],
  "Ghost": [11, 45, "10d8", 1, "fly 40 ft (hover)", "Withering Touch +5 (4d6+3 necrotic); Horrifying Visage (DC 13 Wis save or frightened and aged); Possession (Recharge 6, DC 13 Cha save)", "Ethereal Sight; Incorporeal Movement; Etherealness", "controller"],
  "Ettin": [12, 85, "10d10+30", -1, "40 ft", "Multiattack: Battleaxe +7 (2d8+5 slashing) and Morningstar +7 (2d8+5 piercing)", "Two Heads (advantage on Perception and vs. blinded, charmed, deafened, frightened, stunned, unconscious); Wakeful", "brute"],
  "Troll": [15, 84, "8d10+40", 1, "30 ft", "Multiattack: Bite +7 (1d6+4 piercing) and 2 Claws +7 (2d6+4 slashing)", "Regeneration 10 (stopped for a turn by acid or fire damage); Keen Smell", "brute"],
  "Wraith": [13, 67, "9d8+27", 3, "fly 60 ft (hover)", "Life Drain +6 (4d8+3 necrotic; DC 14 Con save or max HP reduced); Create Specter from a fresh corpse", "Incorporeal Movement; Sunlight Sensitivity; resists nonmagical non-silvered weapons", "leader"],
  "Earth elemental": [17, 126, "12d10+60", -1, "30 ft, burrow 30 ft", "Multiattack: 2 Slam +8 (2d8+5 bludgeoning)", "Earth Glide; Siege Monster; vulnerable to thunder; resists nonmagical weapons", "brute"],
  "Hill giant": [13, 105, "10d12+40", -1, "40 ft", "Multiattack: 2 Greatclub +8, reach 10 ft (3d8+5 bludgeoning); Rock +8, 60/240 ft (3d10+5)", "None", "giant"],
  "Vampire spawn": [15, 82, "11d8+33", 3, "30 ft", "Multiattack: Claws +6 (2d4+3 slashing, grapple DC 13) and Bite +6 on a grappled target (1d6+3 + 3d6 necrotic, heals it)", "Regeneration 10; Spider Climb; Vampire Weaknesses (sunlight, running water, stake)", "skirmisher"],
  "Otyugh": [14, 114, "12d10+48", 0, "30 ft", "Multiattack: Bite +6 (2d8+3 piercing; DC 15 Con save vs. disease) and 2 Tentacles +6 (1d8+3 + 1d8; grappled); Tentacle Slam (DC 14 Con save or stunned)", "Limited Telepathy", "brute"],
  "Roper": [20, 93, "11d10+33", -1, "10 ft, climb 10 ft", "Multiattack: 4 Tendrils +7, reach 50 ft (grappled, restrained, disadvantage on Str checks), Reel, and Bite +7 (4d8+4 piercing)", "False Appearance; Grasping Tendrils; Spider Climb", "ambusher"],
  "Gladiator": [16, 112, "15d8+45", 2, "30 ft", "Multiattack: 3 Spear +7 (2d6+4 piercing) or 2 Spear + Shield Bash +7 (2d4+4, DC 15 Str save or prone)", "Brave; Brute; Parry (+3 AC)", "brute"],
  "Mage": [15, 40, "9d8", 2, "30 ft", "Dagger +5 (1d4+2). Spells (DC 14, +6): cone of cold, greater invisibility, ice storm, fireball, counterspell, fly, misty step, suggestion, shield, magic missile", "AC 15 with mage armor (12 without)", "caster"],
  "Medusa": [15, 127, "17d8+51", 2, "30 ft", "Multiattack: Snake Hair +5 (1d4+2 + 4d6 poison), Shortsword +5 (1d6+2) ×2, or Longbow +5 ×2 (1d8+2 + 2d6 poison)", "Petrifying Gaze (DC 14 Con save; restrained then petrified)", "controller"],
  "Chimera": [14, 114, "12d10+48", 0, "30 ft, fly 60 ft", "Multiattack: Bite +7 (2d6+4), Horns +7 (1d12+4), Claws +7 (2d6+4); Fire Breath (Recharge 5–6): 15-ft cone, DC 15 Dex save, 7d8 fire", "Keen Perception", "flier"],
  "Wyvern": [13, 110, "13d10+39", 0, "20 ft, fly 80 ft", "Multiattack: Bite +7 (2d6+4 piercing) and Stinger +7 (2d6+4 + DC 15 Con save, 7d6 poison, half on success)", "None", "flier"],
  "Stone giant": [17, 126, "11d12+55", 2, "40 ft", "Multiattack: 2 Greatclub +9, reach 15 ft (3d8+6); Rock +9, 60/240 ft (4d10+6, DC 17 Str save or prone)", "Stone Camouflage; Rock Catching (reaction)", "giant"],
  "Young black dragon": [18, 127, "15d10+45", 2, "40 ft, fly 80 ft, swim 40 ft", "Multiattack: Bite +7 (2d10+4 + 1d8 acid) and 2 Claws +7 (2d6+4); Acid Breath (Recharge 5–6): 30-ft line, DC 14 Dex save, 11d8 acid", "Amphibious; immune to acid", "dragon"],
  "Oni": [16, 110, "13d10+39", 0, "30 ft, fly 30 ft", "Multiattack: 2 Glaive +7, reach 10 ft (2d10+4 slashing). Innate spells: darkness, invisibility, charm person, sleep, cone of cold, gaseous form", "Regeneration 10; Change Shape; Magic Weapons", "caster"],
  "Assassin": [15, 78, "12d8+24", 3, "30 ft", "Multiattack: 2 Shortsword +6 (1d6+3 + 7d6 poison, DC 15 Con save for half); Light crossbow +6, 80/320 ft (1d8+3 + 7d6 poison)", "Assassinate (advantage vs. creatures that haven't acted; hits on surprised creatures are crits); Evasion; Sneak Attack (+4d6)", "ambusher"],
  "Young green dragon": [18, 136, "16d10+48", 1, "40 ft, fly 80 ft, swim 40 ft", "Multiattack: Bite +7 (2d10+4 + 2d6 poison) and 2 Claws +7 (2d6+4); Poison Breath (Recharge 5–6): 30-ft cone, DC 14 Con save, 12d6 poison", "Amphibious; immune to poison", "dragon"],
  "Hydra": [15, 172, "15d12+75", 1, "30 ft, swim 30 ft", "Multiattack: one Bite per head (starts with 5) +8, reach 10 ft (1d10+5 piercing)", "Multiple Heads (25+ damage in one turn severs a head; two regrow unless fire damage); Reactive Heads (extra reactions); Wakeful; Hold Breath", "solo"],
  "Bone devil": [19, 142, "15d10+60", 3, "40 ft, fly 40 ft", "Multiattack: 2 Claws +8 (1d8+4 slashing) and Sting +8 (2d8+4 + 5d6 poison, DC 14 Con save or poisoned 1 minute)", "Devil's Sight; Magic Resistance; immune to fire and poison", "skirmisher"],
  "Fire giant": [18, 162, "13d12+78", -1, "30 ft", "Multiattack: 2 Greatsword +11, reach 10 ft (6d6+7 slashing); Rock +11, 60/240 ft (4d10+7)", "Immune to fire", "giant"],
  "Clay golem": [14, 133, "14d10+56", -1, "20 ft", "Multiattack: 2 Slam +8 (2d10+5; DC 15 Con save or max HP reduced); Haste (Recharge 5–6)", "Acid Absorption; Berserk (at 60 HP or less); Immutable Form; Magic Resistance", "mindless"],
  "Stone golem": [17, 178, "17d10+85", -1, "30 ft", "Multiattack: 2 Slam +10 (3d8+6 bludgeoning); Slow (Recharge 5–6, DC 17 Wis save)", "Immutable Form; Magic Resistance; Magic Weapons", "mindless"],
  "Young red dragon": [18, 178, "17d10+85", 0, "40 ft, climb 40 ft, fly 80 ft", "Multiattack: Bite +10 (2d10+6 + 1d6 fire) and 2 Claws +10 (2d6+6); Fire Breath (Recharge 5–6): 30-ft cone, DC 17 Dex save, 16d6 fire", "Immune to fire", "dragon"],
  "Aboleth": [17, 135, "18d10+36", -1, "10 ft, swim 40 ft", "Multiattack: 3 Tentacles +9 (2d6+5; DC 14 Con save vs. disease); Tail +9 (3d6+5); Enslave (3/day, DC 14 Wis save or charmed)", "Amphibious; Mucous Cloud; Probing Telepathy; Legendary Actions (3): Detect, Tail Swipe, Psychic Drain", "solo"],
  "Deva": [17, 136, "16d8+64", 4, "30 ft, fly 90 ft", "Multiattack: 2 Mace +8 (1d6+4 + 4d8 radiant); Healing Touch (3/day, 20 HP). Innate spells: raise dead, commune, detect evil and good", "Angelic Weapons; Magic Resistance; Change Shape", "caster"],
  "Behir": [17, 168, "16d12+64", 3, "50 ft, climb 40 ft", "Multiattack: Bite +10 (3d10+6) and Constrict +10 (2d10+6 + 2d10+6, grappled/restrained); Lightning Breath (Recharge 5–6): 20-ft line, DC 16 Dex save, 12d10; Swallow", "Immune to lightning", "solo"],
  "Remorhaz": [17, 195, "17d12+85", 1, "30 ft, burrow 20 ft", "Bite +11 (6d10+7 piercing + 3d6 fire); Swallow (6d6 acid per turn)", "Heated Body (3d6 fire to anyone who touches or hits it in melee)", "brute"],
  "Horned devil": [18, 178, "17d10+85", 3, "20 ft, fly 60 ft", "Multiattack: 2 Fork +10, reach 10 ft (2d8+6) and Tail +10 (1d8+6 + Infernal Wound, 3d6 each turn); Hurl Flame +7, 150 ft (4d6 fire) in place of any attack", "Devil's Sight; Magic Resistance; immune to fire and poison", "flier"],
  "Archmage": [15, 99, "18d8+18", 2, "30 ft", "Dagger +6 (1d4+2). Spells (DC 17, +9): time stop, mind blank, teleport, globe of invulnerability, cone of cold, scrying, banishment, fire shield, lightning bolt, counterspell, mirror image, misty step", "Magic Resistance; AC 15 with mage armor; casts mind blank and stoneskin in advance", "caster"],
  "Erinyes": [18, 153, "18d8+72", 3, "30 ft, fly 60 ft", "Multiattack: 3 Longsword +8 (1d8+4 + 3d8 poison) or 3 Longbow +7 (1d8+3 + 3d8 poison, DC 14 Con or poisoned)", "Hellish Weapons; Magic Resistance; Parry (+4 AC)", "skirmisher"],
  "Adult white dragon": [18, 200, "16d12+96", 0, "40 ft, burrow 30 ft, fly 80 ft, swim 40 ft", "Multiattack: Frightful Presence, Bite +11 (2d10+6 + 1d8 cold), 2 Claws +11 (2d6+6); Tail +11 (2d8+6); Cold Breath (Recharge 5–6): 60-ft cone, DC 19 Con save, 12d8 cold", "Ice Walk; Legendary Resistance (3/day); Legendary Actions (3): Detect, Tail, Wing Attack", "dragon"],
  "Rakshasa": [16, 110, "13d8+52", 3, "40 ft", "Multiattack: 2 Claws +7 (2d6+2 slashing; target cursed, can't benefit from rests). Innate spells: detect thoughts, disguise self, suggestion, charm person, dominate person, fly, plane shift, true seeing", "Limited Magic Immunity (unaffected by spells of 6th level or lower); vulnerable to piercing from good creatures' magic weapons", "caster"],
  "Vampire": [16, 144, "17d8+68", 4, "30 ft", "Multiattack: 2 attacks, only one Bite. Unarmed Strike +9 (1d8+4, or grapple); Bite +9 (1d6+4 + 3d6 necrotic, heals it); Charm (DC 17 Wis save); Children of the Night (1/day)", "Regeneration 20; Spider Climb; Shapechanger; Legendary Resistance (3/day); Legendary Actions (3): Move, Unarmed Strike, Bite; Vampire Weaknesses", "solo"],
  "Storm giant": [16, 230, "20d12+100", 2, "50 ft, swim 50 ft", "Multiattack: 2 Greatsword +14, reach 10 ft (6d6+9); Rock +14 (4d12+9); Lightning Strike (Recharge 5–6): DC 17 Dex save, 12d8 lightning", "Amphibious; spells: control weather, levitate, water breathing", "giant"],
  "Adult black dragon": [19, 195, "17d12+85", 2, "40 ft, fly 80 ft, swim 40 ft", "Multiattack: Frightful Presence, Bite +11 (2d10+6 + 1d8 acid), 2 Claws +11 (2d6+6); Tail +11 (2d8+6); Acid Breath (Recharge 5–6): 60-ft line, DC 18 Dex save, 12d8 acid", "Amphibious; Legendary Resistance (3/day); Legendary Actions (3): Detect, Tail, Wing Attack", "dragon"],
  "Ice devil": [18, 180, "19d10+76", 2, "40 ft", "Multiattack: Bite +10 (2d6+5 + 3d6 cold), Claws +10 (2d4+5 + 3d6 cold), Tail +10 (2d6+5 + 3d6 cold); Wall of Ice (Recharge 6)", "Devil's Sight; Magic Resistance; immune to fire, cold, poison", "brute"],
  "Mummy lord": [17, 97, "13d8+39", 0, "20 ft", "Multiattack: Dreadful Glare and Rotting Fist +9 (3d6+4 + 6d6 necrotic, curse). Spells (DC 17): harm, contagion, insect plague, animate dead, guardian of faith, hold person, silence", "Magic Resistance; Rejuvenation; Legendary Actions (3): Attack, Blinding Dust, Blasphemous Word, Channel Negative Energy, Whirlwind of Sand", "solo"],
  "Purple worm": [18, 247, "15d20+90", -2, "50 ft, burrow 30 ft", "Multiattack: Bite +9, reach 10 ft (3d8+9; DC 19 Dex save or swallowed, 6d6 acid per turn) and Tail Stinger +9 (3d6+9 + DC 19 Con save, 12d6 poison)", "Tunneler; Tremorsense 60 ft", "solo"],
  "Iron golem": [20, 210, "20d10+100", -1, "30 ft", "Multiattack: 2 Slam +13 (3d8+7) or Sword +13, reach 10 ft (3d10+7); Poison Breath (Recharge 6): 15-ft cone, DC 19 Con save, 10d8 poison", "Fire Absorption; Immutable Form; Magic Resistance", "mindless"],
  "Marilith": [18, 189, "18d10+90", 5, "40 ft", "Multiattack: 6 Longsword +9 (2d8+4) and Tail +9, reach 10 ft (2d10+4, grappled/restrained); Teleport", "Magic Resistance; Reactive (one reaction on every turn); Parry (+5 AC)", "solo"],
  "Planetar": [19, 200, "16d10+112", 5, "40 ft, fly 120 ft", "Multiattack: 2 Greatsword +12 (4d6+7 + 5d8 radiant); Healing Touch (4/day). Innate spells: flame strike, blade barrier, insect plague, raise dead", "Divine Awareness; Magic Resistance; Angelic Weapons", "caster"],
  "Adult red dragon": [19, 256, "19d12+133", 0, "40 ft, climb 40 ft, fly 80 ft", "Multiattack: Frightful Presence, Bite +14 (2d10+8 + 2d6 fire), 2 Claws +14 (2d6+8); Tail +14 (2d8+8); Fire Breath (Recharge 5–6): 60-ft cone, DC 21 Dex save, 18d6 fire", "Legendary Resistance (3/day); Legendary Actions (3): Detect, Tail, Wing Attack; Lair Actions", "dragon"],
  "Dragon turtle": [20, 341, "22d20+110", 0, "20 ft, swim 40 ft", "Multiattack: Bite +13 (3d12+7), 2 Claws +13 (2d8+7), Tail +13 (3d12+7, prone); Steam Breath (Recharge 5–6): 60-ft cone, DC 18 Con save, 15d6 fire", "Amphibious; resists fire", "solo"],
  "Demilich": [20, 80, "20d4", 5, "fly 30 ft (hover)", "Howl (Recharge 5–6): DC 15 Con save or drop to 0 HP; Life Drain (up to 3 creatures, DC 19 Con save, 10d6 necrotic)", "Avoidance; Legendary Resistance (3/day); Turn Immunity; Legendary Actions (3): Flight, Cloud of Dust, Energy Drain, Vile Curse", "solo"],
  "Balor": [19, 262, "21d12+126", 2, "40 ft, fly 80 ft", "Multiattack: Longsword +14, reach 10 ft (3d8+8 + 3d8 lightning) and Whip +14, reach 30 ft (2d6+8 + 3d6 fire, pulled 25 ft); Teleport", "Fire Aura (3d6 fire to nearby creatures); Death Throes (20d6 fire explosion); Magic Resistance", "solo"],
  "Pit fiend": [19, 300, "24d10+168", 2, "30 ft, fly 60 ft", "Multiattack: Bite +14 (4d6+8 + poison, DC 21 Con), Claw +14 (2d8+8), Mace +14 (2d6+8 + 6d6 fire), Tail +14 (3d10+8). Innate spells: fireball, hold monster, wall of fire", "Fear Aura (DC 21 Wis); Magic Resistance; Magic Weapons", "solo"],
  "Lich": [17, 135, "18d8+54", 3, "30 ft", "Paralyzing Touch +12 (3d6 cold; DC 18 Con save or paralyzed). Spells (DC 20, +12): power word kill, finger of death, disintegrate, globe of invulnerability, cloudkill, dimension door, blight, counterspell, fireball, mirror image, ray of frost", "Legendary Resistance (3/day); Rejuvenation; Turn Resistance; Legendary Actions (3): Cantrip, Paralyzing Touch, Frightening Gaze, Disrupt Life", "solo"],
  "Solar": [21, 243, "18d10+144", 6, "50 ft, fly 150 ft", "Multiattack: 2 Greatsword +15 (4d6+8 + 6d8 radiant); Slaying Longbow +13 (2d8+6 + 6d8 radiant; DC 15 Con save or die if at 100 HP or less); Flying Sword; Healing Touch", "Divine Awareness; Magic Resistance; Legendary Actions (3): Teleport, Searing Burst, Blinding Gaze", "solo"],
  "Ancient blue dragon": [22, 481, "26d20+208", 0, "40 ft, burrow 40 ft, fly 80 ft", "Multiattack: Frightful Presence, Bite +16 (2d10+9 + 4d10 lightning), 2 Claws +16 (2d6+9); Tail +16 (2d8+9); Lightning Breath (Recharge 5–6): 120-ft line, DC 23 Dex save, 16d10", "Legendary Resistance (3/day); Legendary Actions (3); Lair Actions", "dragon"],
  "Kraken": [18, 472, "27d20+189", 0, "20 ft, swim 60 ft", "Multiattack: 3 Tentacles +17, reach 30 ft (3d6+10, grappled), or Fling; Bite +17 (3d8+10, swallow); Lightning Storm (DC 23 Dex, 4d10)", "Amphibious; Freedom of Movement; Siege Monster; Legendary Actions (3): Tentacle, Fling, Lightning Storm, Ink Cloud", "solo"],
  "Ancient red dragon": [22, 546, "28d20+252", 0, "40 ft, climb 40 ft, fly 80 ft", "Multiattack: Frightful Presence, Bite +17 (2d10+10 + 4d6 fire), 2 Claws +17 (2d6+10); Tail +17 (2d8+10); Fire Breath (Recharge 5–6): 90-ft cone, DC 24 Dex save, 26d6 fire", "Legendary Resistance (3/day); Legendary Actions (3); Lair Actions", "dragon"]
};
const ROLE_TAC = {
  minion: "Fight in a mob: rush the nearest hero, gang up where possible, and break and run once half the group is down or their leader falls.",
  pack: "Hunt as a pack: surround one target (ideally an isolated or downed hero) to get advantage, flank, and drag prey away from the group. Retreat when the pack is cut in half.",
  skirmisher: "Hit and run: open from range or cover, focus the softest target (casters, healers), use mobility to avoid being pinned, and fall back to regroup instead of trading blows.",
  brute: "Charge straight in and hit the biggest threat or whoever hurt it last. Brutes rarely retreat; describe every hit as bone-crunching.",
  soldier: "Hold a disciplined line: stay shoulder to shoulder so allies are adjacent, shield the leader or archers, and focus fire on one hero at a time. They retreat in order, not in panic.",
  mindless: "No tactics: attack the nearest creature, ignore threats, bluffs and fear, and fight until destroyed. Reward clever players who use doors, chokepoints or the creature's weaknesses.",
  ambusher: "Start hidden (Stealth vs. passive Perception) and strike from surprise. Target lone or wounded heroes, then melt back into darkness or terrain if the fight turns.",
  ooze: "Lurk motionless until someone gets close, then engulf or corrode. It's slow: let the heroes choose to fight or avoid it, and describe what happens to their gear.",
  flier: "Stay airborne and out of melee reach: dive, attack and pull back. Pick on heroes who have no ranged attacks, and use height and wind to stay safe.",
  controller: "Disable first (charm, paralysis, fear, petrification), then let allies finish the job. Keep distance and spread conditions across several heroes.",
  caster: "Stay behind allies or cover. Open with the strongest area or control spell, protect concentration, and use defensive magic (shield, misty step, invisibility) the moment a hero closes in.",
  leader: "Command from the back: give orders aloud, use reactions and buffs, and send minions at whoever is winning. At low HP, parley, bargain or escape so they can return later.",
  solo: "Use every action: regular turn, reactions and legendary actions. Move constantly, split the party, switch targets each round, and change the battlefield when bloodied.",
  dragon: "Open with the breath weapon on clustered heroes, then fly and strafe instead of standing in melee. Use legendary actions to reposition, and flee at low HP; dragons are proud but not suicidal.",
  swarm: "Pour over one target and stay on it. Swarms ignore everyone else and are best handled with area spells or fire.",
  giant: "Hurl rocks at range first, then wade in with reach. Knock heroes prone, grab small foes and fling them, and smash scenery for dramatic effect."
};
const TERRAIN = {
  crypt: ["Sarcophagi and burial niches (half cover, hiding spots)", "Total darkness beyond torchlight", "A collapsing floor or sealed door that can split the party", "Old offerings and urns that can be smashed or used as distractions"],
  cavern: ["Narrow tunnels that force single file (chokepoints)", "Stalagmites (half cover) and slick rock (difficult terrain)", "A ledge or chasm, so a shove becomes a fall", "Echoes that carry noise to nearby creatures"],
  keep: ["Doors and portcullises to slam or bar", "Arrow slits and balconies for archers", "Tables, banners and chandeliers to topple, swing on or set alight", "A bell or horn that summons reinforcements in 1d4 rounds"],
  sewer: ["Deep water channels (difficult terrain, risk of being swept along)", "Narrow walkways above the sludge", "Grates and pipes for small creatures to vanish into", "Pockets of foul gas (DC 12 Con save or poisoned)"],
  temple: ["Pillars (three-quarters cover) and an altar to fight over", "Braziers or holy fonts that can be tipped or used", "Stained glass or skylights for dramatic entrances", "A desecrated or consecrated circle that empowers one side"],
  mine: ["Ore carts on rails to ride or crash", "Shafts and ladders to climb or fall down", "Unstable supports that can bring the ceiling down (DC 13 Dex save, 4d10)", "Lanterns that can be smashed to plunge an area into darkness"],
  open: ["A low wall, wagon or hedge for half cover", "High ground: a rise, rooftop or tree", "Difficult terrain such as mud, brush or rubble", "Something that can catch fire or collapse"]
};
const crNum = s => s === "1/8" ? .125 : s === "1/4" ? .25 : s === "1/2" ? .5 : +s;
const CUSTOM_CR = {};
const monCR = name => { if (CUSTOM_CR[name] !== undefined) return CUSTOM_CR[name]; const m = MON.find(x => x[0] === name); return m ? m[1] : (VSTAT.find(v => v[0] === name) || [0, 0])[1]; };
function parseEncText(text) {
  const out = []; if (!text) return out;
  const vm = text.match(/^(.+?) \(use the (.+?) stat block, CR ([\d/]+)\)/);
  if (vm) out.push({ name: vm[1], stat: vm[2], cr: crNum(vm[3]), count: 1, boss: true });
  const re = /(\d+) × (.+?) \(CR ([\d/]+)\)/g; let m;
  while ((m = re.exec(text))) out.push({ name: m[2], stat: m[2], cr: crNum(m[3]), count: +m[1], boss: false });
  return out;
}
function makeEnemies(groups) {
  const rows = [];
  groups.forEach(g => {
    const st = MSTAT[g.stat] || [12, 10 + Math.round(g.cr * 15), "", 0, "30 ft", "", "", "brute"];
    for (let k = 1; k <= g.count; k++) rows.push({ id: uid("m"), name: g.count > 1 ? `${g.name} ${k}` : g.name, stat: g.stat, cr: g.cr, ac: st[0], hp: st[1], max: st[1], init: "", cond: "", boss: !!g.boss });
  });
  return rows;
}
/* ---- random encounters: monsters from the Monster Manual's environments, sized with the same XP maths as the encounter builder ---- */
const RAND_ENVS = [["forest", "Forest"], ["grassland", "Grassland & roads"], ["hills", "Hills"], ["mountain", "Mountains"], ["desert", "Desert"], ["swamp", "Swamp"], ["coast", "Coast"], ["ocean", "At sea"], ["arctic", "Arctic"], ["urban", "City streets"], ["ruins", "Ruins"], ["caves", "Caves"], ["underworld", "Underdark"], ["tomb", "Tomb"], ["sewer", "Sewers"], ["feywild", "Feywild"], ["shadowfell", "Shadowfell"]];
const RAND_HOOKS = ["hunting for food", "fighting among themselves over a kill", "guarding their lair", "asleep, with one keeping a lazy watch", "on the move and in a hurry", "lying in ambush for travellers", "searching for something they lost", "fleeing from something worse", "feeding and distracted", "wounded and angry"];
/* the same hooks for a single creature, in the same order (so a seed rolls the same pick) */
const RAND_HOOKS_ONE = ["hunting for food", "tearing into a fresh kill", "guarding its lair", "asleep, but a light sleeper", "on the move and in a hurry", "lying in ambush for travellers", "searching for something it lost", "fleeing from something worse", "feeding and distracted", "wounded and angry"];
const RAND = { env: "forest", diff: "medium" };
let RAND_MON = null;
function randMonsters() { if (!RAND_MON) { const d = dmData("monsterData"); RAND_MON = (d["2014"] || []).filter(m => (m.env || []).length && CR_XP[m.cr] !== undefined && m.hp > 0); } return RAND_MON; }
function randHook(hook, n) { return n > 1 ? hook : RAND_HOOKS_ONE[RAND_HOOKS.indexOf(hook)]; }
function randMonster(name) { return randMonsters().find(m => m.n === name) || null; }
function randomEncounter(r, env, level, party, diff, poolForCampaign = randMonsters()) {
  level = clamp(level, 1, 20); const target = partyThr(level, party, diff), cap = target * 1.5, lo = level <= 3 ? 0 : level / 4, hi = level + (diff === "deadly" ? 4 : 2);
  const here = poolForCampaign.filter(m => m.env.includes(env)); if (!here.length) return null;
  let pool = here.filter(m => m.cr >= lo && m.cr <= hi); if (pool.length < 2) pool = here.filter(m => m.cr <= hi); if (!pool.length) pool = here;
  let best = null;
  for (let a = 0; a < 40; a++) { const m = r.pick(pool); for (let n = 1; n <= 8; n++) { const adj = n * xpOf(m.cr) * mult(n); if (adj > cap) break; const score = Math.abs(adj - target); if (!best || score < best.score) best = { m, n, score }; } }
  if (!best) best = { m: pool.reduce((a, b) => (a.cr <= b.cr ? a : b)), n: 1 }; // nothing fits: the weakest thing that lives here
  return { groups: [{ name: best.m.n, stat: best.m.n, cr: best.m.cr, count: best.n, boss: false }], monster: best.m, hook: `${best.n > 1 ? best.n + " × " + best.m.n : "A lone " + best.m.n}, ${randHook(r.pick(RAND_HOOKS), best.n)}.` };
}
function randRoll(c) {
  const lv = c.currentLevel || 1, rules = normalizeSourceRules(c.sourceRules);
  let pool = randMonsters();
  if (rules) {
    const raw = dmData("monsterData");
    const habitats = new Map(raw["2014"].filter(m => m.env?.length).map(m => [m.n, m.env]));
    pool = raw[rules.edition].filter(m => sourceAllowed(rules, m.src, false) && CR_XP[m.cr] !== undefined && m.hp > 0)
      .map(m => m.env?.length ? m : { ...m, env: habitats.get(m.n) || [] });
  }
  const res = randomEncounter(makeRng("rand", Date.now(), Math.random()), RAND.env, lv, partySize(c), RAND.diff, pool);
  if (!res) { toast("No monsters live there in the Monster Manual. Try another place."); return; }
  const g = res.groups[0], label = (RAND_ENVS.find(x => x[0] === RAND.env) || [0, RAND.env])[1];
  const e = newEncounter(null, `Random: ${label} — ${g.count > 1 ? g.count + " × " : ""}${g.name}`, lv, res.groups, { notes: res.hook, kind: "random" });
  e.enemies.forEach(m => { m.ac = res.monster.ac; m.hp = m.max = res.monster.hp; });
  c.encounters = c.encounters || []; c.encounters.push(e); Store.save(c); renderTracker();
  const el = document.getElementById("enc-" + e.id); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  toast(`Rolled: ${res.hook}`);
}
function randHTML() {
  return `<div class="card rand-enc"><div class="row" style="align-items:center;gap:8px;flex-wrap:wrap"><b style="font-family:Cinzel,serif">🎲 Random encounter</b>
    <select id="randEnv" aria-label="Where" style="width:auto;flex:0 0 auto">${RAND_ENVS.map(([k, v]) => `<option value="${k}" ${k === RAND.env ? "selected" : ""}>${v}</option>`).join("")}</select>
    <select id="randDiff" aria-label="Difficulty" style="width:auto;flex:0 0 auto">${["easy", "medium", "hard", "deadly"].map(k => `<option value="${k}" ${k === RAND.diff ? "selected" : ""}>${k[0].toUpperCase() + k.slice(1)}</option>`).join("")}</select>
    <button class="btn sm primary" type="button" id="randRoll" style="flex:0 0 auto">Roll</button><span class="muted" style="font-size:14px">Monsters that live there, sized for your party's level. It's added below.</span></div></div>`;
}
function newEncounter(chId, name, level, groups, extra = {}) {
  return Object.assign({ id: uid("e"), chId, name, status: "Planned", level, enemies: makeEnemies(groups), round: 0, turn: null, pcInit: {}, notes: "" }, extra);
}
function partySize(c) { return (c.gen && c.gen.settings && c.gen.settings.party) || (c.party || []).length || 4; }
function encMath(c, e) {
  const enemies=e.enemies.filter(m=>!m.fungal);
  const raw = enemies.reduce((s, m) => s + xpOf(m.cr), 0), n = enemies.length;
  const adj = Math.round(raw * mult(n)), lv = clamp(+e.level || c.currentLevel || 1, 1, 20), p = partySize(c);
  return { raw, adj, rating: n ? rateXP(adj, lv, p) : "—", lv, p };
}
function seedEncounters(c) {
  if (!Array.isArray(c.encounters)) c.encounters = [];
  if (!c.gen || !c.gen.outline || c.encSeeded) return false;
  const g = c.gen, o = g.outline;
  if (o.kind === "campaign") {
    o.chapters.forEach((ch, i) => {
      const t = c.chapters.find(x => x.title === `${ch.title} (Lv ${ch.level})`) || c.chapters[i];
      const chId = t ? t.id : null, loc = g.locations[ch.loc] || g.locations[0];
      const r = makeRng(g.seed, "skirmish", i);
      const sk = buildEncounter(r, ch.level, g.settings.party, i === 0 ? "easy" : r.pick(["easy", "medium"]), TAGMAP[loc.mapTheme]);
      c.encounters.push(newEncounter(chId, i === 0 ? `First blood: trouble on the way to ${ch.location}` : `Skirmish: on the road to ${ch.location}`, ch.level, parseEncText(sk.text), { kind: "skirmish", loc: ch.loc, ci: i }));
      if (ch.enc) c.encounters.push(newEncounter(chId, `${ch.enc.climax ? "Boss fight" : "Main encounter"}: ${ch.location}`, ch.level, parseEncText(ch.enc.text), { kind: ch.enc.climax ? "boss" : "main", loc: ch.loc, ci: i }));
    });
  } else {
    o.scenes.forEach((sc, i) => {
      if (!sc.enc) return;
      const t = c.chapters.find(x => x.title === sc.title) || c.chapters[i];
      c.encounters.push(newEncounter(t ? t.id : null, `${sc.title}${sc.loc !== undefined && g.locations[sc.loc] ? ": " + g.locations[sc.loc].name : ""}`, o.level, parseEncText(sc.enc.text), { kind: sc.enc.climax ? "boss" : "main", loc: sc.loc !== undefined ? sc.loc : 2, ci: i }));
    });
  }
  c.encSeeded = true; return true;
}
function encGuide(c, e) {
  const g = c.gen, loc = g && e.loc !== undefined ? g.locations[e.loc] : null;
  const types = []; e.enemies.filter(m=>!m.fungal).forEach(m => { let t = types.find(x => x.stat === m.stat && x.boss === m.boss); if (!t) types.push(t = { stat: m.stat, boss: m.boss, name: m.boss ? m.name : m.stat, n: 0, cr: m.cr }); t.n++; });
  const roles = types.map(t => (MSTAT[t.stat] || [])[7] || "brute");
  const M = encMath(c, e), boss = types.find(t => t.boss);
  const P = [];
  const where = loc ? `${loc.name} (${loc.type}, ${loc.desc})` : "the chapter's main location";
  const hidden = types.filter((t, i) => ["ambusher", "ooze"].includes(roles[i])).map(t => t.name);
  const ranged = types.filter((t, i) => ["skirmisher", "caster", "flier", "leader", "giant"].includes(roles[i])).map(t => t.name);
  const front = types.filter((t, i) => ["brute", "soldier", "mindless", "pack", "minion", "swarm"].includes(roles[i])).map(t => t.name);
  let setup = `Run this at ${where}. `;
  if (hidden.length) setup += `${hidden.join(" and ")} start hidden; roll Stealth against the heroes' passive Perception to check for surprise. `;
  if (front.length) setup += `${front.join(" and ")} start in front, between the heroes and the objective. `;
  if (ranged.length) setup += `${ranged.join(" and ")} hold back behind cover or on high ground. `;
  if (e.kind === "skirmish") setup += "This is a warm-up: it should cost a few resources, not a life. Let it reveal a clue about what lies ahead.";
  if (e.kind === "boss" && boss) setup += `${boss.name} should be visible from the start, ideally talking, so the heroes know exactly who they are fighting.`;
  P.push(["Setup", setup]);
  P.push(["Enemies and tactics", types.map((t, i) => {
    const s = MSTAT[t.stat];
    const head = `${t.boss ? `${t.name} (uses the ${t.stat} stat block)` : t.name} ×${t.n}, CR ${crLabel(t.cr)}`;
    return s ? `${head}: AC ${s[0]}, HP ${s[1]} (${s[2]}), speed ${s[4]}, init ${s[3] >= 0 ? "+" : ""}${s[3]}. Attacks: ${s[5]}. Traits: ${s[6]}. How it fights: ${ROLE_TAC[s[7]]}` : `${head}. Use the stat block from the Monster Manual or SRD.`;
  })]);
  const tkey = loc ? loc.mapTheme : "open";
  P.push(["Battlefield", `Use 2 or 3 of these at ${loc ? loc.name : "the site"}: ` + (TERRAIN[tkey] || TERRAIN.open).join("; ") + "."]);
  const r1 = hidden.length ? `Round 1: hidden enemies strike first at whoever is isolated or at the back.` : ranged.length ? `Round 1: ranged enemies open fire while the front line closes.` : `Round 1: the enemy charges; make the first hit land hard so the threat feels real.`;
  const r2 = boss ? `Rounds 2–3: ${boss.name} targets whoever looks most dangerous and orders the others to focus fire. When ${boss.name} drops below half HP, change the battlefield (reinforcements, a collapse, a fire, or a desperate new tactic) and let them make a short speech about their motive.`
    : `Rounds 2–3: focus fire on one hero to create tension; if a hero drops, have enemies switch to a new target rather than finishing them off (unless they are mindless).`;
  P.push(["Running the fight", `${r1} ${r2} Describe enemy wounds as HP falls (bloodied at half) so players can tell they are winning.`]);
  const mindless = roles.every(r => ["mindless", "ooze", "swarm"].includes(r));
  P.push(["Morale", mindless ? "These creatures never flee or surrender; the fight ends when they are destroyed or the heroes escape."
    : `Enemies try to flee or surrender when ${boss ? `${boss.name} falls, or ` : ""}half their number are down. A captured survivor is a great source of information for the next chapter.`]);
  const base = types.filter(t => !t.boss).sort((a, b) => b.n - a.n)[0];
  P.push(["Scaling", `Rated ${M.rating} for ${M.p} heroes of level ${M.lv} (adjusted XP ${M.adj.toLocaleString()}). Too easy? ${base ? `Add 1–2 more enemies of the ${base.name} type, or ` : ""}give the enemies maximum HP and a terrain advantage. Too hard? ${base && base.n > 1 ? `Remove one ${base.name}, ` : ""}have one enemy hold back or flee early, or let an ally NPC arrive in round 3.`]);
  P.push(["Rewards", `${M.raw.toLocaleString()} XP total (${Math.floor(M.raw / M.p).toLocaleString()} each for ${M.p} heroes). Add a clue, a key, or a coin pouch worth about ${Math.max(5, Math.round(M.raw / 10 / 5) * 5)} gp on the bodies.`]);
  return P;
}
const openGuides = new Set();
function encOrder(c, e) {
  const rows = e.enemies.filter(m => !m.fungal && m.init !== "" && m.init !== null).map(m => ({ key: m.id, name: m.name, init: +m.init, foe: true, down: m.hp <= 0, dex: foeInit(m.stat) }));
  (c.party || []).forEach(p => { const v = e.pcInit && e.pcInit[p.id]; if (v !== undefined && v !== "") rows.push({ key: p.id, name: p.name || "Hero", init: +v, foe: false, down: false, dex: 99 }); });
  rows.sort((a, b) => b.init - a.init || b.dex - a.dex);
  const allies=e.enemies.filter(m=>m.fungal&&fungalZombiePresent(m,e));
  return rows.flatMap(row=>row.foe?[row]:[row,...allies.filter(m=>m.fungal.ownerId===row.key)
    .map(m=>({key:m.id,name:m.name,init:row.init,foe:true,ally:true,down:m.hp<=0}))]);
}
function campaignBestiaryEntryAllowed(c, b) {
  const rules = normalizeSourceRules(c.sourceRules);
  if (!rules) return true;
  if (b.ed === "custom" || !b.ed) return rules.homebrew;
  const source = b.src || dmData("monsterData")[b.ed]?.find(m => m.n === b.name || b.name === `${m.n} (${b.ed})`)?.src;
  return rules.edition === b.ed && sourceAllowed(rules, source, false);
}
function encounterCatalog(c) {
  const rules = normalizeSourceRules(c.sourceRules);
  if (!rules) return null;
  return new Map(dmData("monsterData")[rules.edition].filter(m => sourceAllowed(rules, m.src, false)).map(m => [m.n, m]));
}
function encCard(c, e) {
  const M = encMath(c, e), order = encOrder(c, e);
  const hpPct = m => Math.max(0, Math.min(100, Math.round(m.hp / (m.max || 1) * 100)));
  const catalog = encounterCatalog(c);
  const opts = MON.map(m => m[0]).concat(VSTAT.map(v => v[0])).filter((n, i, a) => a.indexOf(n) === i && (!catalog || catalog.has(n))).sort((a, b) => monCR(a) - monCR(b) || a.localeCompare(b));
  const mine = (c.bestiary || []).filter(b => campaignBestiaryEntryAllowed(c, b)).map(b => b.name);
  const guide = encGuide(c, e);
  const fighting = e.status === "Active" && (e.round || 0) > 0 && e.enemies.some(m => m.init !== "" && m.init !== null);
  return `<div class="encard ${e.status === "Done" ? "done" : ""} ${e.status === "Active" ? "live" : ""}" id="enc-${e.id}">
    <div class="row" style="align-items:center;gap:8px;flex-wrap:wrap">
      <input type="text" data-ef="name" data-eid="${e.id}" value="${esc(e.name)}" style="flex:1;min-width:220px;font-weight:600" aria-label="Encounter name">
      <select data-ef="status" data-eid="${e.id}" style="width:auto;flex:0 0 auto" aria-label="Status">${["Planned", "Active", "Done"].map(s => `<option ${e.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
      ${partyChars(c).some(x => x.pc) && M.raw ? `<button class="btn sm ${e.xpAwarded ? "" : "primary"}" type="button" data-ea="xp" data-eid="${e.id}" title="Split this encounter's XP between the party's characters">🏆 ${e.xpAwarded ? "XP awarded · again" : `Award ${M.raw.toLocaleString()} XP`}</button>` : ""}
      <button class="btn sm" type="button" data-ea="hoard" data-eid="${e.id}" title="Roll treasure for this encounter, for the campaign's Loot">💰 Hoard</button>
      <button class="icon-btn" data-ea="delEnc" data-eid="${e.id}" title="Delete encounter">✕</button>
    </div>
    <div class="enc-meta"><span class="r ${M.rating}">${M.rating}</span> <span>Adjusted XP <b>${M.adj.toLocaleString()}</b> · ${M.raw.toLocaleString()} XP to award</span> <span class="lvl-in">Level <input type="number" min="1" max="20" data-ef="level" data-eid="${e.id}" value="${M.lv}"></span>${e.kind ? `<span class="tag">${e.kind === "boss" ? "Boss" : e.kind === "skirmish" ? "Skirmish" : "Main"}</span>` : ""}</div>
    <div class="enc-bar">
      ${(c.maps || []).length ? `<label>Encounter map <select data-ef="map" data-eid="${esc(e.id)}">
        <option value="">No map</option>${(c.maps || []).map(m => `<option value="${esc(m.id)}" ${m.id === e.mapId ? "selected" : ""}>${esc(m.name)}</option>`).join("")}
        </select></label>` : ""}
      ${(c.maps || []).some(m => m.id === e.mapId) ? `<button class="btn sm" type="button" data-openmap="${esc(e.mapId)}">Open encounter map</button>` : ""}
      <button class="btn sm primary" type="button" data-fopen="${esc(e.id)}" title="Open this fight full screen: turn order, conditions, saves and concentration">▶ Run fight</button>
      <button class="btn sm ${fighting ? "" : "primary"}" data-ea="roll" data-eid="${e.id}">🎲 Roll enemy initiative</button>
      <label class="chk-inline" title="One initiative roll for each kind of monster, so all the goblins act together"><input type="checkbox" data-ef="groupInit" data-eid="${e.id}" ${e.groupInit ? "checked" : ""}> Group by monster</label>
      <button class="btn sm ${fighting ? "primary" : ""}" data-ea="next" data-eid="${e.id}" ${order.length ? "" : "disabled"}>Next turn ▶</button>
      ${combatHistory(e).some(row => !row.undone) ? `<button class="btn sm" type="button" data-ea="undo" data-eid="${esc(e.id)}">Undo combat action</button>` : ""}
      <button class="btn sm" data-ea="reset" data-eid="${e.id}">Reset</button>
      <button class="btn sm" data-ea="tv" data-eid="${e.id}" title="Show the turn order on the player screen (TV). Monsters show as Bloodied or Down, never their HP.">${HOST.enc && HOST.enc.eid === e.id ? "📺 Off TV" : "📺 Show on TV"}</button>
      ${window.Portal?.linkedTrackerId?.() === c.id ? `<button class="btn sm" data-ea="players" data-eid="${e.id}" title="Show the turn order on your players' phones. Monsters show as Bloodied or Down, never their HP.">${playersFight(c.id, e.id) ? "📱 Off players' phones" : "📱 Show players"}</button>` : ""}
      <span class="muted" style="font-size:14px">${e.round ? `Round <b>${e.round}</b>` : "Not started"}</span>
      <details class="enc-more"><summary class="btn sm">More</summary>${sessionQueueButton("encounters", e)}<button class="btn sm" type="button" data-ea="saveTemplate" data-eid="${esc(e.id)}">Save as template</button></details>
    </div>
    ${order.length ? `<div class="init-strip">${order.map(o => `<span class="init-chip ${o.foe && !o.ally ? "foe" : "pc"} ${o.down ? "down" : ""} ${e.turn === o.key ? "cur" : ""}">${e.turn === o.key ? "▶ " : ""}${esc(o.name)} <b>${o.init}</b></span>`).join("")}</div>` : ""}
    ${combatHistoryHTML(e)}
    <table class="foes"><thead><tr><th>${e.enemies.some(m=>m.fungal&&fungalZombiePresent(m,e))?"Creature":"Enemy"}</th><th>AC</th><th>HP</th><th>Damage / heal</th><th>Init</th><th>Conditions</th><th></th></tr></thead><tbody>
      ${e.enemies.filter(m=>fungalZombiePresent(m,e)).map(m => `<tr class="${m.hp <= 0 ? "down" : ""} ${e.turn === m.id ? "cur" : ""}">
        <td><input type="text" data-ef="mname" data-eid="${e.id}" data-mid="${m.id}" value="${esc(m.name)}" aria-label="${m.fungal?"Ally":"Enemy"} name">${m.fungal?`<div class="k">Fungal Infestation ally</div>`:m.boss ? `<div class="k">${esc(m.stat)} stat block · CR ${crLabel(m.cr)}</div>` : `<div class="k">CR ${crLabel(m.cr)}</div>`}</td>
        <td><b>${m.ac}</b></td>
        <td style="min-width:110px"><div class="row" style="gap:4px;align-items:center"><input type="number" data-ef="hp" data-eid="${e.id}" data-mid="${m.id}" value="${m.hp}" style="width:64px" aria-label="Current HP"><span class="muted">/ ${m.max}</span></div><div class="hpbar"><i style="width:${hpPct(m)}%;background:${hpPct(m) > 50 ? "var(--green)" : hpPct(m) > 0 ? "var(--gold)" : "var(--red)"}"></i></div></td>
        <td><div class="row" style="gap:4px"><input type="number" min="0" data-amt="${m.id}" placeholder="0" style="width:58px" aria-label="Amount"><button class="btn sm danger" data-ea="dmg" data-eid="${e.id}" data-mid="${m.id}" title="Apply damage">−</button><button class="btn sm" data-ea="heal" data-eid="${e.id}" data-mid="${m.id}" title="Heal">+</button></div></td>
        <td>${m.fungal?"After owner":`<input type="number" data-ef="init" data-eid="${e.id}" data-mid="${m.id}" value="${m.init}" style="width:56px" aria-label="Initiative">`}</td>
        <td>${(m.conds || []).length || m.conc ? `<div class="enc-conds">${m.conc ? `<span class="fight-chip conc">◎ ${esc(m.conc.spell)}</span>` : ""}${(m.conds || []).map(cd => `<span class="fight-chip">${esc(fightCondLabel(cd.k))}</span>`).join("")}</div>` : ""}<input type="text" data-ef="cond" data-eid="${e.id}" data-mid="${m.id}" value="${esc(m.cond)}" placeholder="prone, poisoned…" aria-label="Conditions"></td>
        <td><button class="icon-btn" data-ea="delMon" data-eid="${e.id}" data-mid="${m.id}" title="Remove">✕</button></td></tr>`).join("") || `<tr><td colspan="7" class="muted">No enemies yet. Add some below.</td></tr>`}
    </tbody></table>
    ${(c.party || []).length ? `<div class="pc-init"><span class="muted" style="font-size:14px">Hero initiative:</span>${c.party.map(p => `<label>${esc(p.name || "Hero")} <input type="number" data-ef="pcinit" data-eid="${e.id}" data-pid="${p.id}" value="${e.pcInit && e.pcInit[p.id] !== undefined ? e.pcInit[p.id] : ""}" style="width:56px"></label>`).join("")}</div>` : `<p class="hint" style="margin:6px 0 0">Add heroes on the Party tab to track their initiative here too.</p>`}
    <div class="row add-foe"><select data-addsel="${e.id}" aria-label="Monster">${mine.length ? `<optgroup label="Your creatures">${mine.map(n => `<option value="${esc(n)}">${esc(n)} (CR ${crLabel(monCR(n))})</option>`).join("")}</optgroup><optgroup label="Monster list">` : ""}${opts.map(n => `<option value="${esc(n)}">${esc(n)} (CR ${crLabel(monCR(n))})</option>`).join("")}${mine.length ? "</optgroup>" : ""}</select><input type="number" min="1" max="20" value="1" data-addn="${e.id}" style="width:70px;flex:0 0 70px" aria-label="Count"><button class="btn sm" data-ea="addMon" data-eid="${e.id}">+ Add enemy</button></div>
    <details class="brief guide" data-guide="${e.id}" ${openGuides.has(e.id) ? "open" : ""}><summary>How to run this encounter</summary><div>${guide.map(([h, b]) => Array.isArray(b) ? `<p><b>${h}:</b></p><ul class="plain tac">${b.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p><b>${h}:</b> ${esc(b)}</p>`).join("")}</div></details>
    ${e.treasure ? `<div class="enc-treasure">💰 <b>Treasure</b> (on the Loot tab): ${esc(e.treasure).replace(/\n/g, "<br>")}</div>` : ""}
    <textarea data-ef="notes" data-eid="${e.id}" placeholder="Encounter notes: what happened, loot dropped, who fled…" style="min-height:44px;margin-top:8px">${esc(e.notes)}</textarea>
  </div>`;
}
/* the party during play: AC, hit points, conditions, concentration, passive Perception, with damage and healing */
const XP_LEVELS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
const xpNext = c => { const L = totalLv(c); return L >= 20 ? null : XP_LEVELS[L]; };
const partyChars = camp => (camp.party || []).map(pt => ({ pt, pc: pt.pcId ? PCS.roster.find(x => x.id === pt.pcId) : null }));
function partyGlanceHTML(camp) {
  const P = partyChars(camp); if (!P.length) return "";
  const row = ({ pt, pc }) => {
    if (!pc) return `<tr><td><b>${esc(pt.name || "Hero")}</b><br><span class="muted" style="font-size:13px">${esc(pt.cls || "")} · no saved sheet</span></td><td colspan="6" class="muted">Save the character on the Characters tab to see it here.</td></tr>`;
    pcEnsure(pc);
    const conds = CONDS.filter(([k]) => condOn(pc, k)).map(([, l]) => l), D = pc.death || {}, max = +pc.hp || 0, hp = pc.hpCur === undefined || pc.hpCur === "" || isNaN(+pc.hpCur) ? max : +pc.hpCur, pct = max ? Math.max(0, Math.min(100, Math.round(hp / max * 100))) : 0;
    const state = D.dead ? "☠ Dead" : hp === 0 ? (D.stable ? "Stable" : `Dying (${D.s || 0}✓ ${D.f || 0}✗)`) : "";
    return `<tr class="${hp === 0 ? "down" : ""}"><td><button type="button" class="link-b" data-openpc="${esc(pc.id)}" title="Open ${esc(pc.name)}'s sheet"><b>${esc(pc.name)}</b></button><br><span class="muted" style="font-size:13px">${esc((pc.multi || []).length ? classLine(pc) : `${pc.cls} ${pc.level}`)}${pt.player ? ` · ${esc(pt.player)}` : ""}</span></td>
      <td><b>${esc(pc.ac)}</b></td>
      <td><div class="hpbar"><span style="width:${pct}%"></span></div>${hp}/${max}${+pc.hpTemp ? ` <span class="muted">+${pc.hpTemp}</span>` : ""}${state ? `<br><span class="warn">${state}</span>` : ""}</td>
      <td>${pc.passive}</td><td>${sgn(pc.init)}</td>
      <td>${conds.length || exhOf(pc) ? `<span class="warn">${esc([...conds, ...(exhOf(pc) ? [`Exhaustion ${exhOf(pc)}`] : [])].join(", "))}</span>` : `<span class="muted">—</span>`}${pc.conc ? `<br><span class="tag gold">◎ ${esc(pc.conc.spell)}</span>${pc.concCheck ? ` <span class="warn">save DC ${pc.concCheck}</span>` : ""}` : ""}</td>
      <td><div class="row" style="gap:4px;flex-wrap:nowrap"><input type="number" min="0" data-pgamt="${esc(pc.id)}" placeholder="0" style="width:58px" aria-label="Amount for ${esc(pc.name)}"><button class="btn sm danger" type="button" data-pg="damage" data-pc="${esc(pc.id)}" title="Damage ${esc(pc.name)}">−</button><button class="btn sm" type="button" data-pg="heal" data-pc="${esc(pc.id)}" title="Heal ${esc(pc.name)}">+</button></div></td></tr>`;
  };
  return `<div class="party-glance sec"><div class="sec-h"><h3>Party</h3><span class="sp"></span><span class="muted" style="font-size:13px">Live from each character's sheet · damage applies to temp HP first and asks for concentration saves</span></div>
    <div style="overflow-x:auto"><table class="foes pg-table"><thead><tr><th>Hero</th><th>AC</th><th>HP</th><th>Passive Perc.</th><th>Init</th><th>Conditions</th><th>Damage / heal</th></tr></thead><tbody>${P.map(row).join("")}</tbody></table></div></div>`;
}
document.addEventListener("click", e => {
  const o = e.target.closest("[data-openpc]"); if (o) { RC.id = o.dataset.openpc; location.hash = "roster"; renderRosterTab(); return; }
  const g = e.target.closest("[data-pg]"); if (!g) return;
  const inp = (g.closest("#fightWin") || document).querySelector(`[data-pgamt="${CSS.escape(g.dataset.pc)}"]`), v = Math.abs(parseInt(inp && inp.value) || 0); if (!v) { if (inp) inp.focus(); return; }
  toast(actApply("pc:" + g.dataset.pc, v, g.dataset.pg)); renderTracker();
});
function encounterTemplatesHTML(c) {
  const templates = Array.isArray(c.encounterTemplates) ? c.encounterTemplates : [];
  if (!templates.length) return "";
  return `<details class="card" open><summary>Encounter templates</summary>
    ${templates.filter(t => t && typeof t.id === "string").map(t => `<div class="item-h"><b>${esc(t.name)}</b>
      <button class="btn sm" type="button" data-ea="startTemplate" data-template="${esc(t.id)}">Start encounter</button>
      <button class="btn sm danger" type="button" data-ea="deleteTemplate" data-template="${esc(t.id)}">Delete template</button>
    </div>`).join("")}
  </details>`;
}
function renderEncounters(c) {
  const encs = c.encounters || [];
  const chIds = new Set(c.chapters.map(x => x.id));
  const group = (ch, list, i) => `<div class="enc-ch" id="encch-${ch ? ch.id : "other"}">
      <div class="sec-h"><h3>${ch ? `${esc(c.gen && c.gen.outline.kind === "oneshot" ? "Scene" : "Chapter")} ${i + 1}: ${esc(ch.title || "Untitled")}` : "Other encounters"}</h3><span class="sp"></span>${ch ? `<button class="btn sm" data-ea="addEnc" data-ch="${ch.id}">+ Add encounter</button>` : ""}</div>
      ${list.length ? list.map(e => encCard(c, e)).join("") : `<p class="muted" style="margin:0 0 6px">No encounters planned for this ${ch ? "chapter" : "campaign"} yet.</p>`}</div>`;
  let h = encounterTemplatesHTML(c) + partyGlanceHTML(c) + randHTML() + `<p class="hint" style="margin-top:0">Each chapter's fights with enemy stats, HP and initiative tracking, and notes on how to run them. Roll initiative, enter damage, then press Next turn to step through the round.</p>`;
  h += c.chapters.map((ch, i) => group(ch, encs.filter(e => e.chId === ch.id), i)).join("");
  const orphans = encs.filter(e => !chIds.has(e.chId));
  if (orphans.length || !c.chapters.length) h += group(null, orphans, 0) + (c.chapters.length ? "" : `<button class="btn sm" data-ea="addEnc" data-ch="">+ Add encounter</button>`);
  return h;
}
const COMBAT_FIELDS = ["hp", "init", "cond", "conds", "conc", "fungal"];
const ENCOUNTER_STATE_FIELDS = ["status", "round", "turn", "pcInit", "prompts", "casts"]; /* conds, conc, prompts, casts: the fight window (2026-11-25) */
const combatCopy = v => v === undefined ? null : JSON.parse(JSON.stringify(v));
function combatSnapshot(e) {
  return {
    state: Object.fromEntries(ENCOUNTER_STATE_FIELDS.map(key => [key, key === "pcInit" ? { ...e.pcInit } : combatCopy(e[key])])),
    enemies: e.enemies.map(m => ({ id: m.id, hp: m.hp, init: m.init ?? "", cond: m.cond ?? "", conds: combatCopy(m.conds || []), conc: combatCopy(m.conc), fungal: combatCopy(m.fungal) }))
  };
}
function combatHistory(e) {
  return Array.isArray(e.combatHistory) ? e.combatHistory.filter(row => row && typeof row.label === "string" && Array.isArray(row.changes)) : [];
}
function combatRecord(e, before, label) {
  const after = combatSnapshot(e), changes = [];
  const compare = (old, next, keys, id) => {
    for (const key of keys) {
      if (JSON.stringify(old[key]) !== JSON.stringify(next[key])) changes.push({ id, key, before: old[key], after: next[key] });
    }
  };
  compare(before.state, after.state, ENCOUNTER_STATE_FIELDS, null);
  for (const old of before.enemies) {
    const next = after.enemies.find(m => m.id === old.id);
    if (next) compare(old, next, COMBAT_FIELDS, old.id);
  }
  if (changes.length) e.combatHistory = [{ label, changes }, ...combatHistory(e)].slice(0, 25);
}
function combatUndo(c, e) {
  const action = combatHistory(e).find(row => !row.undone);
  if (!action) return;
  const snap = combatSnapshot(e);
  const valid = action.changes.every(({ id, key, after }) => {
    const current = id === null ? snap.state : snap.enemies.find(m => m.id === id);
    return (id === null ? ENCOUNTER_STATE_FIELDS : COMBAT_FIELDS).includes(key) &&
      current && JSON.stringify(current[key]) === JSON.stringify(after);
  });
  if (!valid) { toast("Combat changed since that action. Undo is unavailable."); return; }
  for (const { id, key, before } of action.changes) {
    const record = id === null ? e : e.enemies.find(m => m.id === id);
    record[key] = key === "pcInit" ? { ...before } : combatCopy(before); /* a copy, so the history entry is never changed later */
  }
  if (e.turn && !encOrder(c, e).some(row => row.key === e.turn)) e.turn = null;
  action.undone = true;
  toast(`Undid ${action.label}`);
}
const openCombatHistory = new Set();
function combatHistoryHTML(e) {
  const rows = combatHistory(e);
  if (!rows.length) return "";
  return `<details class="combat-history" data-combat-history="${esc(e.id)}" ${openCombatHistory.has(e.id) ? "open" : ""}>
    <summary>Combat history (${rows.length})</summary>
    <ol class="plain">${rows.map(row => `<li>${esc(row.label)}${row.undone ? ' <span class="muted">· Undone</span>' : ""}</li>`).join("")}</ol>
  </details>`;
}
const encPending = new Set();
function rerenderEnc(c, e) {
  // Deferred so a focused input being replaced (which fires blur/change) can't re-enter mid-update.
  if (HOST.on && HOST.enc && HOST.enc.eid === e.id) hostSend(); // keep the TV's turn order current
  if (encPending.has(e.id)) return; encPending.add(e.id);
  setTimeout(() => { encPending.delete(e.id); const el = document.getElementById("enc-" + e.id); const cc = curCamp(); const ee = cc && findEnc(cc, e.id); if (el && ee) el.outerHTML = encCard(cc, ee); fightBarSync(); if (FIGHT.eid === e.id) fightRender(); }, 0);
}
function findEnc(c, id) { return (c.encounters || []).find(x => x.id === id); }
/* ---- the fight bar: on phones, while a fight is under way, a bar above the bottom navigation shows the round, whose
   turn it is and who's next, with Next turn (2026-11-24). It presses the encounter's own Next turn button. */
function liveFight(c) { return c ? (c.encounters || []).find(e => e.status === "Active" && e.turn && encOrder(c, e).length) : null; }
function fightBarSync() {
  const bar = $("#fightBar"); if (!bar) return;
  const onTracker = ($("section.view.active") || {}).id === "view-tracker"; /* the tab really showing, not just the address */
  const c = onTracker ? curCamp() : null, e = liveFight(c);
  document.body.classList.toggle("fight-on", !!e);
  if (!e) { bar.hidden = true; bar.innerHTML = ""; return; }
  const o = encOrder(c, e).filter(x => !x.down), i = o.findIndex(x => x.key === e.turn), cur = o[i] || o[0], nxt = o.length > 1 ? o[(i + 1) % o.length] : null;
  bar.innerHTML = `<button type="button" class="fight-now" data-fight-go="${esc(e.id)}" title="Go to ${esc(e.name)}"><span class="fight-round">Round ${e.round || 1}</span>
      <span class="fight-who"><b>${esc(cur ? cur.name : "")}</b>${nxt ? `<span class="muted"> · next ${esc(nxt.name)}</span>` : ""}</span></button>
    <button type="button" class="btn primary" data-fight-next="${esc(e.id)}">Next turn ▶</button>`;
  bar.hidden = false;
}
function fightJump(id) {
  /* the fight the bar describes (an Active encounter with a turn), not just the first Active one */
  if (!id) { const e = liveFight(curCamp()); id = e && e.id; } if (!id) return false;
  const live = document.getElementById("enc-" + id); if (!live) return false;
  const row = live.querySelector("tr.cur") || live; row.scrollIntoView({ block: "center", behavior: "instant" }); return true;
}
$("#fightBar").addEventListener("click", ev => {
  const go = ev.target.closest("[data-fight-go]"), next = ev.target.closest("[data-fight-next]");
  const cardFor = id => document.getElementById("enc-" + id);
  if (go) { if (!cardFor(go.dataset.fightGo)) { subTab = "encounters"; renderTracker(); } fightJump(go.dataset.fightGo); return; }
  if (next) {
    const id = next.dataset.fightNext;
    if (!cardFor(id)) { /* the fight's card isn't on screen: take the turn without changing the section */
      const c = curCamp(), e = c && findEnc(c, id); if (!e) return;
      const before = combatSnapshot(e), o = encOrder(c, e).filter(x => !x.down); if (!o.length) return;
      const i = o.findIndex(x => x.key === e.turn), prevTurn = e.turn, prevRound = e.round || 0;
      if (i === -1) e.turn = o[0].key; else if (i + 1 >= o.length) { e.turn = o[0].key; e.round = (e.round || 1) + 1; } else e.turn = o[i + 1].key;
      fightOnTurn(c, e, prevTurn, prevRound);
      combatRecord(e, before, `Advanced turn · Round ${e.round}`); Store.save(c); if (HOST.on && HOST.enc && HOST.enc.eid === e.id) hostSend(); fightBarSync(); return;
    }
    const b = cardFor(id).querySelector('[data-ea="next"]'); if (b) b.click();
  }
});
campMain.addEventListener("change", ev => { if (ev.target.id === "randEnv") RAND.env = ev.target.value; if (ev.target.id === "randDiff") RAND.diff = ev.target.value; });
/* the encounter buttons (data-ea): on the Tracker, and in the fight window, which can sit over any tab (05b-fight.js) */
async function encClick(ev) {
  if (ev.target.id === "randRoll") {
    const c = curCamp(), button = ev.target;
    if (!c || button.disabled) return;
    button.disabled = true;
    try { await dmLoadExtraMonsters(); if (curCamp()?.id === c.id) randRoll(c); }
    finally { button.disabled = false; }
    return;
  }
  const b = ev.target.closest("[data-ea],[data-goenc]"); if (!b) return;
  const c = curCamp(); if (!c) return;
  if (b.dataset.goenc !== undefined) { subTab = "encounters"; renderTracker(); const t = document.getElementById("encch-" + b.dataset.goenc); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  const a = b.dataset.ea, e = findEnc(c, b.dataset.eid);
  if (a === "saveTemplate" && e) {
    const templates = Array.isArray(c.encounterTemplates) ? c.encounterTemplates : [];
    const { name, level, mapId, notes, kind, pcInit, enemies } = e;
    c.encounterTemplates = [...templates, {
      id: uid("template"), name: name || "Encounter", level, mapId, notes, kind,
      pcInit: { ...pcInit },
      enemies: enemies.filter(m=>!m.fungal).map(({ name, stat, cr, ac, max, init, boss }) => ({ name, stat, cr, ac, max, init, boss }))
    }];
    Store.save(c); renderTracker(); toast("Encounter template saved");
    return;
  }
  if (a === "startTemplate" || a === "deleteTemplate") {
    const template = Array.isArray(c.encounterTemplates) && c.encounterTemplates.find(x => x?.id === b.dataset.template);
    if (!template) return;
    if (a === "deleteTemplate") {
      if (!(await confirmBox("Delete encounter template?", template.name, "Delete"))) return;
      c.encounterTemplates = c.encounterTemplates.filter(x => x.id !== template.id);
      Store.save(c); if (curCamp()?.id === c.id) renderTracker();
      return;
    }
    const fight = newEncounter(null, template.name, template.level, [], {
      status: "Active", notes: template.notes || "", kind: template.kind, mapId: template.mapId,
      pcInit: { ...template.pcInit },
      enemies: (Array.isArray(template.enemies) ? template.enemies : []).filter(Boolean).map(m => {
        const max = Math.max(1, Number(m.max) || 1);
        return { id: uid("m"), name: String(m.name || "Enemy"), stat: String(m.stat || ""),
          cr: Number(m.cr) || 0, ac: Number(m.ac) || 10, max, hp: max,
          init: m.init === "" || !Number.isFinite(Number(m.init)) ? "" : Number(m.init), cond: "", boss: !!m.boss };
      })
    });
    c.encounters.push(fight);
    Store.save(c); renderTracker();
    document.getElementById("enc-" + fight.id)?.scrollIntoView({ block: "start" });
    return;
  }
  if (a === "players" && e) {
    if (playersFight(c.id, e.id)) { playersFightSet(null); toast("Turn order taken off your players' phones"); }
    else { playersFightSet({ cid: c.id, eid: e.id }); toast("Your players see the turn order on their phones"); }
    renderTracker(); return;
  }
  if (a === "tv" && e) {
    if (HOST.enc && HOST.enc.eid === e.id) { HOST.enc = null; toast("Turn order taken off the TV"); }
    else { HOST.enc = { cid: c.id, eid: e.id }; if (HOST.show === "handout") { HOST.show = "map"; handoutUI(); } hostEnsure(); toast("Turn order is on the TV"); }
    hostSend(); renderTracker(); return;
  }
  if (a === "addEnc") {
    const ne = newEncounter(b.dataset.ch || null, "New encounter", c.currentLevel || 1, []);
    c.encounters = c.encounters || []; c.encounters.push(ne); Store.save(c); renderTracker();
    const el = document.getElementById("enc-" + ne.id); if (el) { el.scrollIntoView({ block: "center" }); const i = el.querySelector("input"); if (i) i.select(); }
    return;
  }
  if (!e) return;
  if (a === "xp") {
    const M = encMath(c, e), P = partyChars(c).filter(x => x.pc).map(x => x.pc); if (!P.length || !M.raw) return;
    if (e.xpAwarded && !(await confirmBox("Award XP again?", `${M.raw.toLocaleString()} XP from “${e.name}” was already split between the party. Award it again?`, "Award again"))) return;
    const share = Math.floor(M.raw / P.length), ready = [];
    P.forEach(pc => { pc.xp = (+pc.xp || 0) + share; const nx = xpNext(pc); if (nx !== null && pc.xp >= nx) ready.push(pc.name); });
    e.xpAwarded = true; Store.save(c); pcPersist(); renderTracker();
    toast(`${share.toLocaleString()} XP each to ${P.map(x => x.name).join(", ")}.${ready.length ? ` Ready to level up: ${ready.join(", ")}.` : ""}`);
    return;
  }
  if (a === "delEnc") {
    if (!(await confirmBox("Delete encounter?", `Remove “${e.name}” and its enemies?`))) return;
    c.encounters = c.encounters.filter(x => x !== e); Store.save(c); renderTracker(); return;
  }
  const m = e.enemies.find(x => x.id === b.dataset.mid);
  let before = ["dmg", "heal", "roll", "next"].includes(a) ? combatSnapshot(e) : null;
  if (a === "undo") { combatUndo(c, e); Store.save(c); rerenderEnc(c, e); return; }
  if (a === "fungalSlam" || a === "fungalDamage") {
    if(m?.fungal&&fungalZombiePresent(m,e)){
      const result=fungalZombieSlam(m,a==="fungalSlam"?"hit":"damage");
      toast(typeof result==="string"?result:result.msg);
    }
    return;
  }
  if (a === "dmg" || a === "heal") {
    const inp = (b.closest("#fightWin") || document).querySelector(`[data-amt="${b.dataset.mid}"]`); const v = Math.abs(parseInt(inp && inp.value) || 0); if (!m || !v) return;
    m.hp = a === "dmg" ? Math.max(0, m.hp - v) : Math.min(m.max, m.hp + v);
    if (a === "dmg" && m.hp === 0) toast(`${m.name} is down${m.fungal?". Check Undead Fortitude if the damage qualifies.":""}`);
    if (a === "dmg") fightOnFoeDamage(c, e, m, v); /* a foe concentrating: save reminder, or its spell ends at 0 HP */
  } else if (a === "delMon") { e.enemies = e.enemies.filter(x => x !== m); if (e.turn === b.dataset.mid) e.turn = null; }
  else if (a === "addMon") {
    const nm = document.querySelector(`[data-addsel="${e.id}"]`).value, n = clamp(parseInt(document.querySelector(`[data-addn="${e.id}"]`).value) || 1, 1, 20);
    if (!nm) return;
    const catalog = encounterCatalog(c), stored = (c.bestiary || []).find(m => m.name === nm && campaignBestiaryEntryAllowed(c, m));
    const monster = catalog?.get(nm);
    if (catalog && !monster && !stored) return;
    const have = e.enemies.filter(x => x.stat === nm && !x.boss).length;
    const rows = makeEnemies([{ name: nm, stat: nm, cr: stored?.cr ?? monster?.cr ?? monCR(nm), count: n, boss: false }]);
    if (monster && !stored) rows.forEach(row => { row.ac = monster.ac; row.hp = row.max = monster.hp; });
    rows.forEach((r, k) => r.name = (have + n > 1) ? `${nm} ${have + k + 1}` : nm);
    e.enemies.push(...rows);
  } else if (a === "roll") {
    /* re-rolling a fight already under way starts it again at round 1, so ask first (2026-11-24) */
    if (e.status === "Active" && (e.round || 0) > 1 && !(await confirmBox("Re-roll initiative?", `This fight is in round ${e.round}. Re-rolling starts it again at round 1. HP and conditions stay as they are.`, "Re-roll"))) return;
    /* Group initiative: one roll for each kind of monster, as the rules suggest for big fights (2026-11-24) */
    before = combatSnapshot(e); /* after the question, so Undo restores what was there */
    const group = {}, key = x => x.boss ? x.id : x.stat || x.name; /* a boss rolls alone; creatures with no stat block group by name */
    e.enemies.filter(x=>!x.fungal).forEach(x => {
      if (e.groupInit && group[key(x)] !== undefined) { x.init = group[key(x)]; return; }
      x.init = group[key(x)] = 1 + Math.floor(Math.random() * 20) + foeInit(x.stat);
    });
    e.round = 1; e.status = "Active"; const o = encOrder(c, e).filter(x => !x.down); e.turn = o.length ? o[0].key : null;
    fightOnTurn(c, e, null, 0); /* the first creature's start-of-turn saves */
  } else if (a === "next") {
    const o = encOrder(c, e).filter(x => !x.down); if (!o.length) return;
    let i = o.findIndex(x => x.key === e.turn); const prevTurn = e.turn, prevRound = e.round || 0;
    if (i === -1) { e.turn = o[0].key; e.round = e.round || 1; }
    else if (i + 1 >= o.length) { e.turn = o[0].key; e.round = (e.round || 1) + 1; }
    else e.turn = o[i + 1].key;
    if (e.status === "Planned") e.status = "Active";
    fightOnTurn(c, e, prevTurn, prevRound); /* saves at the end and start of turns, conditions that end by themselves */
    if (typeof FIGHT !== "undefined" && FIGHT.eid === e.id) FIGHT.sel = null; /* the window follows whose turn it is */
  } else if (a === "reset") {
    if (!(await confirmBox("Reset encounter?", "Restore all enemies to full HP and clear initiative and conditions?", "Reset"))) return;
    before = combatSnapshot(e);
    fightReset(c, e); /* conditions, concentration and reminders from the fight window (heroes' come off their sheets) */
    e.enemies.forEach(x => {
      x.hp=x.fungal?0:x.max;x.init="";x.cond="";
      if(x.fungal)x.fungal.endRound=0;
    }); e.round = 0; e.turn = null; e.pcInit = {}; e.status = "Planned";
  }
  if (before) {
    const hpBefore = before.enemies.find(x => x.id === m?.id)?.hp;
    const label = a === "dmg" ? `${m.name} took ${hpBefore - m.hp} damage`
      : a === "heal" ? `${m.name} regained ${m.hp - hpBefore} HP`
      : a === "roll" ? "Rolled enemy initiative" : a === "next" ? `Advanced turn · Round ${e.round}` : "Reset encounter";
    combatRecord(e, before, label);
  }
  Store.save(c); rerenderEnc(c, e);
}
campMain.addEventListener("click", encClick);
function onEncField(ev, commit) {
  const t = ev.target; if (!t.dataset || !t.dataset.ef) return;
  const c = curCamp(); if (!c) return; const e = findEnc(c, t.dataset.eid); if (!e) return;
  const f = t.dataset.ef, m = t.dataset.mid ? e.enemies.find(x => x.id === t.dataset.mid) : null;
  const tracked = ["status", "pcinit", "init", "hp", "cond"].includes(f);
  if (tracked && !commit) return;
  const before = tracked ? combatSnapshot(e) : null;
  if (f === "groupInit") e.groupInit = t.checked;
  else if (f === "name" || f === "notes") e[f] = t.value;
  else if (f === "status") e.status = t.value;
  else if (f === "map") e.mapId = (c.maps || []).find(m => m.id === t.value)?.id || "";
  else if (f === "level") e.level = clamp(parseInt(t.value) || 1, 1, 20);
  else if (f === "pcinit") { e.pcInit = e.pcInit || {}; e.pcInit[t.dataset.pid] = t.value === "" ? "" : +t.value; }
  else if (m) {
    if (f === "mname") m.name = t.value;
    else if (f === "cond") m.cond = t.value;
    else if (f === "init") m.init = t.value === "" ? "" : +t.value;
    else if (f === "hp") m.hp = clamp(parseInt(t.value) || 0, 0, m.fungal?m.max:9999);
  }
  if (before) {
    const hero = (c.party || []).find(p => p.id === t.dataset.pid);
    const label = f === "status" ? `Changed encounter status to ${e.status}`
      : f === "pcinit" ? `Changed initiative for ${hero?.name || "hero"}`
      : f === "init" ? `Changed initiative for ${m?.name || "enemy"}`
      : f === "hp" ? `Set ${m?.name || "enemy"} HP to ${m?.hp}` : `Changed conditions for ${m?.name || "enemy"}`;
    combatRecord(e, before, label);
  }
  Store.save(c);
  if (commit && (tracked || f === "level" || f === "map")) rerenderEnc(c, e);
}
campMain.addEventListener("input", ev => onEncField(ev, false));
campMain.addEventListener("change", ev => onEncField(ev, true));
campMain.addEventListener("toggle", ev => { const d = ev.target; if (d.dataset?.combatHistory) d.open ? openCombatHistory.add(d.dataset.combatHistory) : openCombatHistory.delete(d.dataset.combatHistory); if (d.dataset && d.dataset.guide) { d.open ? openGuides.add(d.dataset.guide) : openGuides.delete(d.dataset.guide); } }, true);

/* ======================= Shared with players (signed-in campaigns) =======================
   The DM's browser publishes two things the whole campaign can read (src/portal.js, publishShared):
   - journalFor(c): the party's Tracker campaign as players may see it: quests and session recaps (unless "Players see it" is
     No), the calendar day and weather, and Lore entries ticked "Players see this" without their DM-only sections.
     Quest notes, NPCs, encounters and everything else stay with the DM.
   - turnsNow(): the fight the DM put on players' phones ("📱 Show players"): its name, round and tvInitRows (names, whose
     turn, "Bloodied" or "Down"). Never HP numbers. null when no fight is shown or it's finished. */
const PLAYERS_FIGHT_KEY = "dmforge.playersFight";
function playersFightGet() { try { return JSON.parse(localStorage.getItem(PLAYERS_FIGHT_KEY) || "null"); } catch { return null; } }
function playersFightSet(v) { if (v) localStorage.setItem(PLAYERS_FIGHT_KEY, JSON.stringify(v)); else localStorage.removeItem(PLAYERS_FIGHT_KEY); }
function playersFight(cid, eid) { const f = playersFightGet(); return !!f && f.cid === cid && f.eid === eid; }
function journalFor(c) {
  if (!c) return null;
  const seen = x => x && x.players !== "No";
  const cal = c.cal && c.cal.weather ? { day: c.cal.day, season: cap1(calSeason(c.cal)), weather: c.cal.weather.text || "" } : null;
  return {
    name: c.name || "", cal, sourceRules: normalizeSourceRules(c.sourceRules),
    handouts: journalHandouts(c).filter(x => x.revealed === true).map(x => ({
      id: x.id, title: x.title.slice(0, 100), notes: String(x.notes || "").slice(0, 4000),
      picture: journalPictureOK(x.picture) ? x.picture : undefined, url: npcUrlOk(x.url) ? x.url : undefined,
    })),
    quests: (c.quests || []).filter(seen).map(q => ({ id: q.id, title: q.title || "", status: q.status || "Active", giver: q.giver || "" })),
    sessions: (c.sessions || []).filter(seen).map(x => ({ id: x.id, title: x.title || "", num: x.num || "", date: x.date || "", summary: x.summary || "" })),
    lore: (c.lore || []).filter(x => x.shared).map(x => ({ id: x.id, name: x.name || "", type: x.type || "other", tags: x.tags || [], imgUrl: npcUrlOk(x.imgUrl) ? x.imgUrl : undefined, desc: x.desc || "",
      sections: (x.sections || []).filter(z => !z.dm).map(z => ({ t: z.t || "", x: z.x || "" })) })),
  };
}
function turnsNow() {
  const f = playersFightGet(), c = f && Store.get(f.cid), e = c && findEnc(c, f.eid);
  if (!e || e.status === "Done") return null;
  return { name: e.name || "Fight", round: e.round || 0, rows: tvInitRows(c, e) };
}
/* the empty Tracker's "Start a blank campaign": stays on the section picked from the side menu */
$("#campMain").addEventListener("click", e => { if (!e.target.closest("[data-newcamp]")) return; const c = blankCampaign(); Store.save(c); activeId = c.id; renderTracker(); if (window.sideReady) sideSync(); });
