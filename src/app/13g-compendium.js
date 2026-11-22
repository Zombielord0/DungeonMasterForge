/* Cross-catalog search and read-only references. */
const compendium = { rows: [], request: 0 };
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
function compendiumOpenBook(entry, ed, trigger) {
  const kind = entry.kind.toLowerCase();
  const fields = Object.fromEntries(entry.details);
  const cls = fields["Parent class"];
  const canDraft = sourceAllowed(currentSourceRules(), null, true)
    && (!window.Portal?.views || Portal.views.includes("homebrew"))
    && (!hbCloud() || Portal.isDM())
    && Object.hasOwn(HB_KINDS, kind)
    && !hbBuiltIn(kind, entry.name, cls, ed)
    && !hbOf(kind).some(option => hbEdOk(option, ed) && option.name.toLowerCase() === entry.name.toLowerCase()
      && (kind !== "subclass" || option.cls === cls))
    && (kind !== "subclass" || classList(ed).includes(cls));
  const action = canDraft ? '<p class="hint">Add the rules your table uses before saving this as homebrew.</p><button class="btn sm" type="button" data-book-draft>Start homebrew draft</button>' : "";
  const dialog = characterReference(entry.name, compendiumBookDetail(entry) + action, trigger);
  const draft = $("[data-book-draft]", dialog);
  if (!draft) return;
  draft.onclick = () => {
    const source = dmBook(entry.src).name + (entry.page ? `, p. ${entry.page}` : "");
    const initial = { ed, name: entry.name, desc: `Source: ${source}` };
    if (kind === "spell") {
      const duration = fields.Duration || "";
      Object.assign(initial, {
        l: /^\d$/.test(fields.Level) ? +fields.Level : 0,
        s: SP_SCHOOLS.find(school => school.toLowerCase() === fields.School?.toLowerCase()) || "Evocation",
        t: fields["Casting time"] || "",
        r: fields.Range || "",
        cp: (fields.Components || "").replace(/[^VSM]/g, ""),
        du: duration.replace(/^Concentration,\s*/i, ""),
        co: /^Concentration/i.test(duration),
        ri: fields.Ritual === "Yes",
      });
    } else if (kind === "subclass") initial.cls = cls;
    dialog.close();
    hbOpen(null, kind, initial);
  };
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
  const getReferences = compendiumCatalog(`forge-book-references-${ed}`, `bookReferences${ed}`);
  const getMonsterIndex = showMonsters && !extraMonstersReady
    ? compendiumCatalog("forge-monster-index", "monsterIndex") : null;
  results.innerHTML = "";
  $("#compendiumCount").textContent = "Searching…";
  const [references, monsterIndex] = await Promise.all([getReferences, getMonsterIndex]);
  if (request !== compendium.request) return;
  const words = query.split(/\s+/), matches = [], playable = new Set();
  const wants = kind => !type || type === kind;
  const add = (kind, name, src, homebrew, open, group = "") => {
    if (!sourceAllowed(rules, src, homebrew)) return;
    const entryKey = JSON.stringify([kind, name.toLowerCase(), src]);
    if (group === "Book reference" && playable.has(entryKey)) return;
    if (group !== "Book reference") playable.add(entryKey);
    const source = src ? dmBook(src).name : homebrew ? "Homebrew" : ed === "2024" ? "SRD 5.2" : "SRD 5.1";
    const label = [name, group, kind, source].join(" ").toLowerCase();
    if (words.every(word => label.includes(word))) matches.push({ kind, name, source, group, open });
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
        button => compendiumOpenBook(entry, ed, button), "Book reference");
    }
  }
  matches.sort((a, b) => Number(b.name.toLowerCase().startsWith(query)) - Number(a.name.toLowerCase().startsWith(query)) || a.name.localeCompare(b.name));
  compendium.rows = matches.slice(0, 60);
  const count = matches.length > 60 ? `Showing 60 of ${matches.length} matches` : `${matches.length} matches`;
  $("#compendiumCount").textContent = count + (!references ? " · Book references unavailable" : "")
    + (getMonsterIndex && !monsterIndex && !extraMonstersReady ? " · Extra monster search unavailable" : "");
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
