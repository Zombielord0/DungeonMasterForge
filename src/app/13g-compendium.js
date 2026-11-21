/* Cross-catalog search and read-only references. */
const compendium = { rows: [], request: 0 };
const compendiumTypes = ["Class", "Subclass", "Species", "Background", "Feat", "Spell", "Item", "Monster", "Other rules"];
let compendiumBookRequest;
function compendiumBookRows() {
  if (!compendiumBookRequest) {
    compendiumBookRequest = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = $('meta[name="forge-book-references"]').content;
      script.onload = () => { script.remove(); resolve(); };
      script.onerror = () => { script.remove(); reject(new Error("Book references are unavailable")); };
      document.head.append(script);
    }).then(() => {
      const rows = JSON.parse(window.DMDATA.bookReferences);
      delete window.DMDATA.bookReferences;
      return rows;
    }).catch(() => { compendiumBookRequest = null; return null; });
  }
  return compendiumBookRequest;
}
function compendiumBookDetail(entry) {
  const details = entry.details.map(([label, value]) =>
    `<p><b>${esc(label)}</b> · ${esc(value)}</p>`).join("");
  return `${bookLine(entry)}<p class="hint">Reference only. See the sourcebook for the full rules.</p>${details}`;
}
async function compendiumSearch() {
  const request = ++compendium.request;
  const rules = currentSourceRules(), edition = $("#compendiumEdition");
  edition.disabled = !!rules;
  if (rules) edition.value = rules.edition;
  const query = $("#compendiumQuery").value.trim().toLowerCase();
  const typeSelect = $("#compendiumType");
  const canBrowseMonsters = !window.Portal?.views || Portal.views.includes("monsters");
  typeSelect.querySelector('option[value="Monster"]').hidden = !canBrowseMonsters;
  if (!canBrowseMonsters && typeSelect.value === "Monster") typeSelect.value = "";
  const results = $("#compendiumResults");
  compendium.rows = [];
  if (!query) { results.innerHTML = ""; $("#compendiumCount").textContent = ""; return; }

  const ed = edition.value, type = typeSelect.value;
  const showMonsters = (!type || type === "Monster") && canBrowseMonsters;
  if (showMonsters && !extraMonstersReady) {
    results.innerHTML = "";
    $("#compendiumCount").textContent = "Loading catalog…";
    await dmLoadExtraMonsters();
    if (request !== compendium.request) return;
  }
  const words = query.split(/\s+/), matches = [];
  const wants = kind => !type || type === kind;
  const add = (kind, name, src, homebrew, open, group = "") => {
    if (!sourceAllowed(rules, src, homebrew)) return;
    const source = src ? dmBook(src).name : homebrew ? "Homebrew" : ed === "2024" ? "SRD 5.2" : "SRD 5.1";
    const label = [name, group, kind, source].join(" ").toLowerCase();
    if (words.every(word => label.includes(word))) matches.push({ kind, name, source, group, open });
  };
  const reference = (name, body, trigger) => characterReference(name, body, trigger);
  if (wants("Spell")) {
    spLoad();
    for (const s of SP.data[ed].filter(spell => !spell.pend)) add("Spell", s.n, s.src, s.hb, b => reference(s.n, spDetail(s, { edition: ed, actions: false }), b));
  }
  if (wants("Item")) {
    itLoad();
    for (const item of [...IT.data[ed], ...itCustomList()]) add("Item", item.n, item.src, item.kind === "custom", b => reference(item.n, itDetail(item, false), b));
  }
  if (showMonsters && (!window.Portal?.views || Portal.views.includes("monsters"))) {
    bsLoad();
    for (const m of [...BS.data[ed], ...(BS.data.custom || [])]) add("Monster", m.n, m.src, !!m.key, b => reference(m.n, bsSbHTML(m, ed) + bookLine(m), b));
  }
  if (wants("Class") || wants("Subclass")) {
    for (const name of classList(ed)) {
      if (wants("Class")) add("Class", name, CLASS_DATA[name].hbx?.src, CLASS_DATA[name].hb, b => openProgression(ed, "class", name, "", b, { campaign: true }));
      if (wants("Subclass")) for (const [sub, , hb, src] of subclassList(ed, name)) {
        add("Subclass", sub, src, hb, b => openProgression(ed, "subclass", name, sub, b), name);
      }
    }
  }
  if (wants("Species")) for (const name of raceList(ed)) {
    const species = PC_RACES[ed][name];
    add("Species", name, species.src, species.hb, b => openProgression(ed, "species", name, "", b));
  }
  if (wants("Background")) for (const name of bgList(ed)) {
    add("Background", name, HB_BG[name]?.src, HB_BG[name], b => openBackgroundReference(ed, name, b));
  }
  if (wants("Feat")) for (const feat of featList(ed)) {
    add("Feat", feat[0], feat[6], feat[5], b => reference(feat[0], `<p>${esc(featReqText(feat))}</p>${spFormat(feat[3])}${bookLine({ src: feat[6] })}`, b));
  }
  let bookReferencesUnavailable = false;
  if (ed === "2014" && (type !== "Monster" || canBrowseMonsters)) {
    const rows = await compendiumBookRows();
    if (request !== compendium.request) return;
    bookReferencesUnavailable = !rows;
    for (const entry of rows || []) {
      if (!wants(entry.kind) || (entry.kind === "Monster" && !canBrowseMonsters)) continue;
      add(entry.kind, entry.name, entry.src, false,
        button => reference(entry.name, compendiumBookDetail(entry), button), "Book reference");
    }
  }
  matches.sort((a, b) => Number(b.name.toLowerCase().startsWith(query)) - Number(a.name.toLowerCase().startsWith(query)) || a.name.localeCompare(b.name));
  compendium.rows = matches.slice(0, 60);
  const count = matches.length > 60 ? `Showing 60 of ${matches.length} matches` : `${matches.length} matches`;
  $("#compendiumCount").textContent = count + (bookReferencesUnavailable ? " · Book references unavailable" : "");
  results.innerHTML = compendium.rows.map(({ kind, name, source, group }, i) => `<button class="camp-item" type="button" data-compendium-result="${i}">
    <b>${esc(name)}</b><small>${esc([kind, group, ed, source].filter(Boolean).join(" · "))}</small></button>`).join("");
}
$("#compendiumType").insertAdjacentHTML("beforeend", compendiumTypes.map(type => `<option value="${type}">${type}</option>`).join(""));
$("#compendiumForm").addEventListener("submit", e => { e.preventDefault(); compendiumSearch(); });
$("#compendiumForm").addEventListener("input", compendiumSearch);
$("#compendiumResults").addEventListener("click", e => {
  const button = e.target.closest("[data-compendium-result]");
  if (button) compendium.rows[button.dataset.compendiumResult]?.open(button);
});
