/* Cross-catalog search and read-only references. */
const compendium = { rows: [], page: 0, request: 0, notice: "" };
const COMPENDIUM_PAGE_SIZE = 60;
const compendiumTypes = ["Class", "Subclass", "Species", "Background", "Feat", "Spell", "Item", "Monster", "Other rules"];
const compendiumCatalogs = new Map();
function compendiumCatalog(meta, key) {
  if (!compendiumCatalogs.has(key)) {
    const request = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = $(`meta[name="${meta}"]`).content;
      script.onload = () => { script.remove(); resolve(); };
      script.onerror = () => { script.remove(); reject(new Error("Catalog unavailable")); };
      document.head.append(script);
    }).then(() => {
      const rows = JSON.parse(window.DMDATA[key]);
      delete window.DMDATA[key];
      return rows;
    }).catch(() => { compendiumCatalogs.delete(key); return null; });
    compendiumCatalogs.set(key, request);
  }
  return compendiumCatalogs.get(key);
}
function compendiumBookDetail(entry) {
  const details = entry.details.map(([label, value]) =>
    `<p><b>${esc(label)}</b> · ${esc(value)}</p>`).join("");
  return `${bookLine(entry)}<p class="hint">Reference only. See the sourcebook for the full rules.</p>${details}`;
}
const compendiumText = value => value.normalize("NFKD").toLowerCase()
  .replace(/[\p{M}'’]/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

function renderCompendiumPage() {
  const { rows, page, notice } = compendium;
  const start = page * COMPENDIUM_PAGE_SIZE;
  const end = Math.min(start + COMPENDIUM_PAGE_SIZE, rows.length);
  const prev = $("#compendiumPrevious"), next = $("#compendiumNext");
  const active = document.activeElement;
  $("#compendiumPages").hidden = rows.length <= COMPENDIUM_PAGE_SIZE;
  prev.disabled = page === 0;
  next.disabled = end >= rows.length;
  if (active === prev && prev.disabled && !next.disabled) next.focus();
  if (active === next && next.disabled && !prev.disabled) prev.focus();
  const count = rows.length ? `Showing ${(start + 1).toLocaleString()}–${end.toLocaleString()} of ${rows.length.toLocaleString()} entries` : "0 matches";
  $("#compendiumCount").textContent = count + notice;
  $("#compendiumResults").innerHTML = rows.slice(start, end).map(({ kind, name, source, group, ed }, i) =>
    `<button class="camp-item" type="button" data-compendium-result="${start + i}">
      <b>${esc(name)}</b><small>${esc([kind, group, ed, source].filter(Boolean).join(" · "))}</small></button>`).join("");
}

async function compendiumSearch() {
  const request = ++compendium.request;
  const rules = currentSourceRules(), edition = $("#compendiumEdition");
  edition.disabled = !!rules;
  if (rules) edition.value = rules.edition;
  const query = compendiumText($("#compendiumQuery").value);
  const typeSelect = $("#compendiumType");
  const canBrowseMonsters = !window.Portal?.views || Portal.views.includes("monsters");
  typeSelect.querySelector('option[value="Monster"]').hidden = !canBrowseMonsters;
  if (!canBrowseMonsters && typeSelect.value === "Monster") typeSelect.value = "";
  const results = $("#compendiumResults");
  compendium.rows = [];
  compendium.page = 0;
  $("#compendiumPages").hidden = true;

  const ed = edition.value, type = typeSelect.value;
  const showMonsters = (!type || type === "Monster") && canBrowseMonsters;
  const getReferences = compendiumCatalog(`forge-book-references-${ed}`, `bookReferences${ed}`);
  const getMonsterIndex = showMonsters && !extraMonstersReady
    ? compendiumCatalog("forge-monster-index", "monsterIndex") : null;
  results.innerHTML = "";
  $("#compendiumCount").textContent = query ? "Searching…" : "Loading catalog…";
  const [references, monsterIndex] = await Promise.all([getReferences, getMonsterIndex]);
  if (request !== compendium.request) return;
  const words = query ? query.split(" ") : [], matches = [], playable = new Set();
  const wants = kind => !type || type === kind;
  const add = (kind, name, src, homebrew, open, group = "") => {
    if (!sourceAllowed(rules, src, homebrew)) return;
    const entryKey = JSON.stringify([kind, name.toLowerCase(), src]);
    if (group === "Book reference" && playable.has(entryKey)) return;
    if (group !== "Book reference") playable.add(entryKey);
    const source = src ? dmBook(src).name : homebrew ? "Homebrew" : ed === "2024" ? "SRD 5.2" : "SRD 5.1";
    if (query) {
      const label = compendiumText([name, group, kind, source].join(" "));
      if (!words.every(word => label.includes(word))) return;
    }
    const normalizedName = query ? compendiumText(name) : "";
    const rank = !query ? 0 : normalizedName === query ? 2 : Number(normalizedName.startsWith(query));
    matches.push({ kind, name, source, group, open, ed, rank });
  };
  const reference = (name, body, trigger) => characterReference(name, body, trigger);
  if (wants("Spell")) {
    spLoad();
    for (const s of SP.data[ed].filter(spell => !spell.pend)) add("Spell", s.n, s.src, s.hb, b => reference(s.n, spDetail(s, { edition: ed, actions: false }), b), s.aliases?.join(" · "));
  }
  if (wants("Item")) {
    itLoad();
    for (const item of [...IT.data[ed], ...itCustomList()]) add("Item", item.n, item.src, item.kind === "custom", b => reference(item.n, itDetail(item, false), b));
  }
  if (showMonsters) {
    bsLoad();
    const monsterDetail = (m, button) => reference(m.n, bsSbHTML(m, ed) + bookLine(m), button);
    for (const m of [...BS.data[ed], ...(BS.data.custom || [])]) {
      add("Monster", m.n, m.src, !!m.key, button => monsterDetail(m, button));
    }
    if (!extraMonstersReady) {
      for (const [name, src] of monsterIndex || []) {
        add("Monster", name, src, false, async button => {
          if (!(await dmLoadExtraMonsters())) { toast("Monster details are unavailable. Try again when online."); return; }
          if (!button.isConnected || location.hash !== "#compendium") return;
          const m = BS.data[ed].find(row => row.n === name && row.src === src);
          if (m) monsterDetail(m, button);
        });
      }
    }
  }
  if (wants("Class") || wants("Subclass")) {
    for (const name of campaignClassChoices(ed)) {
      const entry = classData(ed, name).hbx;
      if (wants("Class")) add("Class", name, entry?.book ? entry.src : null, classData(ed, name).hb, b => openProgression(ed, "class", name, "", b, { campaign: true }));
      if (wants("Subclass")) for (const [sub, , hb, src] of campaignSubclassChoices(ed, name)) {
        add("Subclass", sub, src, hb, b => openProgression(ed, "subclass", name, sub, b, { campaign: true }), name);
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
  if (type !== "Monster" || canBrowseMonsters) {
    for (const entry of references || []) {
      if ((entry.ed || "2014") !== ed || !wants(entry.kind) || (entry.kind === "Monster" && !canBrowseMonsters)) continue;
      add(entry.kind, entry.name, entry.src, false,
        button => reference(entry.name, compendiumBookDetail(entry), button), "Book reference");
    }
  }
  matches.sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name));
  compendium.rows = matches;
  compendium.notice = (!references ? " · Book references unavailable" : "")
    + (getMonsterIndex && !monsterIndex && !extraMonstersReady ? " · Extra monster search unavailable" : "");
  renderCompendiumPage();
}
$("#compendiumType").insertAdjacentHTML("beforeend", compendiumTypes.map(type => `<option value="${type}">${type}</option>`).join(""));
$("#compendiumForm").addEventListener("submit", e => { e.preventDefault(); compendiumSearch(); });
$("#compendiumForm").addEventListener("input", compendiumSearch);
$("#compendiumPrevious").addEventListener("click", () => {
  compendium.page--;
  renderCompendiumPage();
});
$("#compendiumNext").addEventListener("click", () => {
  compendium.page++;
  renderCompendiumPage();
});
$("#compendiumResults").addEventListener("click", e => {
  const button = e.target.closest("[data-compendium-result]");
  if (button) compendium.rows[button.dataset.compendiumResult]?.open(button);
});
