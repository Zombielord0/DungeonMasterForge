/* Campaign rules constrain new picks while saved sheets keep their original references. */
function normalizeSourceRules(value) {
  if (!value || !["2014", "2024"].includes(value.edition)) return null;
  return {
    edition: value.edition,
    books: Array.isArray(value.books) ? [...new Set(value.books.filter(x => typeof x === "string" && /^[a-z0-9-]{1,40}$/.test(x)))].slice(0, 100) : [],
    homebrew: value.homebrew === true,
  };
}
function currentSourceRules() {
  return normalizeSourceRules(window.Portal?.cloud ? Portal.sourceRules?.() : (Store.get(activeId) || Store.list()[0])?.sourceRules);
}
function sourceAllowed(rules, book, homebrew) { return !rules || (book ? rules.books.includes(book) : !homebrew || rules.homebrew); }
function campaignRaceChoices(ed) {
  const rules = currentSourceRules();
  return raceList(ed).filter(n => sourceAllowed(rules, PC_RACES[ed][n].src, PC_RACES[ed][n].hb));
}
function campaignLineageChoices(ed, race) {
  const rules = currentSourceRules();
  return Object.entries(PC_RACES[ed]?.[race]?.subs || {})
    .filter(([, lineage]) => sourceAllowed(rules, lineage.src, false)).map(([name]) => name);
}
function campaignClassChoices(ed) {
  const rules = currentSourceRules();
  return classList(ed).filter(n => sourceAllowed(rules, classData(ed, n).hbx?.book ? classData(ed, n).hbx.src : null, classData(ed, n).hb));
}
function campaignBackgroundChoices(ed) {
  const rules = currentSourceRules();
  return bgList(ed).filter(n => sourceAllowed(rules, HB_BG[n]?.src, !!HB_BG[n]));
}
function campaignSubclassChoices(ed, name) {
  const rules = currentSourceRules();
  return subclassList(ed, name, (src, hb) => sourceAllowed(rules, src, hb));
}
function characterSourceIssues(pc, rules) {
  if (!rules) return [];
  const ed = edOf(pc), issues = ed === rules.edition ? [] : [ed + " rules"];
  const check = (name, src, hb) => { if (name && !sourceAllowed(rules, src, hb)) issues.push(name); };
  const species = PC_RACES[ed]?.[pc.race], background = HB_BG[pc.bg];
  check(pc.race, species?.src, species?.hb);
  const lineage = species?.subs?.[pc.sub];
  if (lineage?.src && lineage.src !== species?.src) check(pc.sub, lineage.src, false);
  check(pc.bg, background?.src, !!background);
  for (const entry of [pc, ...(pc.multi || [])]) {
    const classEntry = classData(ed, entry.cls)?.hbx;
    check(entry.cls, classEntry?.book ? classEntry.src : null, classData(ed, entry.cls)?.hb);
    const sub = subclassList(ed, entry.cls).find(([name]) => name === entry.subclass);
    if (sub && !subclassList(ed, entry.cls, (src, hb) => sourceAllowed(rules, src, hb)).some(([name]) => name === entry.subclass)) issues.push(sub[0]);
  }
  for (const name of pcFeatNames(pc)) {
    const feat = featInfo(ed, name);
    if (feat) check(name, feat[6], feat[5]);
  }
  if (pc.prepared?.length) {
    spLoad();
    for (const entry of pc.prepared) {
      const spell = SP.data[entry.ed || ed]?.find(s => s.n === entry.n);
      if (spell) check(spell.n, spell.src, spell.hb);
    }
  }
  for (const entry of pc.inv || []) {
    const item = inventoryCatalogItem(entry, ed);
    if (item) check(item.n || entry.n, item.src, item.kind === "custom");
  }
  return [...new Set(issues)];
}
function campaignSourcesHTML(c) {
  const rules = normalizeSourceRules(c.sourceRules);
  const books = Object.keys(dmBooks()).sort((a, b) => dmBook(a).name.localeCompare(dmBook(b).name));
  const warnings = partyChars(c).filter(({ pc }) => pc).map(({ pc }) => [pc, characterSourceIssues(pc, rules)]).filter(([, issues]) => issues.length);
  return `<form id="campaignSources">
    <h3>Campaign sourcebooks</h3>
    <label>Rules edition <select name="edition">
      <option value="">Open selection</option><option ${rules?.edition === "2014" ? "selected" : ""}>2014</option><option ${rules?.edition === "2024" ? "selected" : ""}>2024</option>
    </select></label>
    <p class="hint">An edition keeps its SRD enabled. Select additional sources to use when making new character and encounter choices.</p>
    <fieldset><legend>Additional sources</legend><label class="check"><input type="checkbox" name="homebrew" ${!rules || rules.homebrew ? "checked" : ""}> Campaign homebrew</label>
    ${books.map(code => `<label class="check"><input type="checkbox" name="books" value="${esc(code)}" ${!rules || rules.books.includes(code) ? "checked" : ""}> ${esc(dmBook(code).name)}</label>`).join("")}</fieldset>
    <button class="btn primary sm" type="submit">Save sourcebooks</button>
    ${warnings.length ? `<h4>Characters to review</h4><ul>${warnings.map(([pc, issues]) => `<li>${esc(pc.name)} · ${esc(issues.join(", "))}</li>`).join("")}</ul>` : ""}
  </form>`;
}
$("#campMain").addEventListener("submit", event => {
  if (event.target.id !== "campaignSources") return;
  event.preventDefault();
  const c = curCamp(); if (!c) return;
  const data = new FormData(event.target);
  c.sourceRules = normalizeSourceRules({ edition: data.get("edition"), books: data.getAll("books"), homebrew: data.has("homebrew") });
  Store.save(c); renderTracker(); pcSelectsRefresh();
  toast("Campaign sourcebooks saved");
});

/* Handouts carry only material explicitly revealed by the DM. */
const JOURNAL_IMAGE_MAX = 95000;
const JOURNAL_HANDOUT_MAX = 6;
function journalPictureOK(value) {
  return typeof value === "string" && value.length <= JOURNAL_IMAGE_MAX && /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
function journalHandouts(c) {
  const rows = Array.isArray(c.handouts) ? c.handouts : [];
  return rows.filter(x => x && typeof x.id === "string" && typeof x.title === "string").slice(0, JOURNAL_HANDOUT_MAX);
}
function campaignHandoutsHTML(c) {
  const rows = journalHandouts(c);
  return `<h3>Journal handouts</h3>
    <p class="hint">Reveal a clue, an uploaded image, an NPC portrait, or a snapshot of the current player map. Revealed handouts appear in the linked campaign's Journal.</p>
    ${rows.map(x => `<details class="lore-card"><summary>${esc(x.title)}</summary>
      ${journalPictureOK(x.picture) || npcUrlOk(x.url) ? `<img class="journal-handout-picture" src="${esc(journalPictureOK(x.picture) ? x.picture : x.url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}
      ${mdHTML(String(x.notes || ""))}
      <div class="item-h"><span>${x.revealed ? "Revealed" : "Hidden"}</span>
      <button class="btn sm" data-journal-reveal="${esc(x.id)}">${x.revealed ? "Hide" : "Reveal"}</button>
      <button class="btn sm danger" data-journal-delete="${esc(x.id)}">Delete</button></div></details>`).join("")}
    ${rows.length >= JOURNAL_HANDOUT_MAX ? "<p>Delete a handout to add another.</p>" : `<form id="journalHandoutForm">
      <label>Title<input name="title" required maxlength="100"></label>
      <label>Player notes<textarea name="text" maxlength="4000"></textarea></label>
      <label>Upload a picture<input type="file" name="picture" accept="image/png,image/jpeg,image/webp"></label>
      <label>Attach a campaign image<select name="image"><option value="">None</option>
        ${currentMap ? '<option value="map">Current player map (with fog)</option>' : ""}
        ${(c.npcs || []).filter(n => n.img || npcUrlOk(n.imgUrl)).map(n => `<option value="${esc("npc:" + n.id)}">Portrait · ${esc(n.name)}</option>`).join("")}
      </select></label>
      <button class="btn primary sm" type="submit">Save hidden handout</button>
    </form>`}`;
}
async function journalEncodeImage(source) {
  for (const size of [900, 640, 420, 280]) {
    const canvas = document.createElement("canvas"), scale = Math.min(1, size / Math.max(source.width, source.height));
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
    const picture = canvas.toDataURL("image/webp", 0.7);
    if (journalPictureOK(picture)) return picture;
  }
  throw new Error("The picture could not be resized for the Journal.");
}
$("#campMain").addEventListener("submit", async event => {
  if (event.target.id !== "journalHandoutForm") return;
  event.preventDefault();
  const c = curCamp(), form = event.target, data = new FormData(form);
  if (!c || form.dataset.saving) return;
  const title = String(data.get("title") || "").trim().slice(0, 100);
  const notes = String(data.get("text") || "").trim().slice(0, 4000);
  const select = String(data.get("image") || ""), file = data.get("picture");
  if (!title) return;
  form.dataset.saving = "1";
  try {
    let canvas, url;
    if (file?.size) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choose a PNG, JPEG, or WebP image.");
      ({ cv: canvas } = await loadImageCanvas(file));
    }
    else if (select === "map" && currentMap) {
      canvas = document.createElement("canvas");
      drawDungeon(canvas, currentMap, $("#mapGrid").checked, { player: true, fog: HOST.fog || new Uint8Array(currentMap.W * currentMap.H), found: HOST.found, numbers: HOST.numbers, scale: 2 });
    } else if (select.startsWith("npc:")) {
      const npc = c.npcs.find(n => n.id === select.slice(4));
      if (npc?.img) {
        const blob = await MAPIMG.get(npc.img);
        if (!blob) throw new Error("That portrait isn't stored on this device.");
        ({ cv: canvas } = await loadImageCanvas(blob));
      } else if (npcUrlOk(npc?.imgUrl)) url = npc.imgUrl;
    }
    const picture = canvas ? await journalEncodeImage(canvas) : undefined;
    if (!notes && !picture && !url) { toast("Add player notes or a picture."); return; }
    if (Store.get(c.id) !== c || journalHandouts(c).length >= JOURNAL_HANDOUT_MAX) return;
    c.handouts = [...journalHandouts(c), { id: uid("handout"), title, notes, picture, url, revealed: false }];
    Store.save(c);
    if (curCamp() === c && subTab === "handouts") renderTracker();
  } catch (error) { toast(error.message || "Couldn't save that handout."); }
  finally { delete form.dataset.saving; }
});
$("#campMain").addEventListener("click", async event => {
  const button = event.target.closest("[data-journal-reveal],[data-journal-delete]");
  const c = curCamp();
  if (!button || !c) return;
  const { journalReveal, journalDelete } = button.dataset;
  const handout = journalHandouts(c).find(x => x.id === (journalReveal || journalDelete));
  if (!handout) return;
  if (journalDelete) {
    if (!(await confirmBox("Delete handout?", handout.title, "Delete")) || Store.get(c.id) !== c) return;
    c.handouts = journalHandouts(c).filter(x => x.id !== handout.id);
  } else handout.revealed = !handout.revealed;
  Store.save(c);
  if (curCamp() === c && subTab === "handouts") renderTracker();
});
