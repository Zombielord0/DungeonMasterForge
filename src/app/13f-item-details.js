/* Item reference and effects derived from the character's current inventory. */
function inventoryCatalogItem(i, ed) {
  if (i.itemRules?.kind === "custom") {
    const snapshot = i.itemRules;
    return { ...snapshot, st: Array.isArray(snapshot.st) ? snapshot.st.filter(row => Array.isArray(row) && row.length >= 2) : [] };
  }
  const ref = i.ref && itFind(i.ref);
  if (ref) return ref;
  const name = String(i.n || "").trim().toLowerCase();
  itLoad();
  return IT.data[ed].find(x => x.n.toLowerCase() === name) || null;
}

function inventoryRulesSnapshot(x) {
  if (!x || x.kind !== "custom") return undefined;
  return { kind: x.kind, cat: x.cat, type: x.type, rk: x.rk, r: x.r, att: x.att, st: x.st, w: x.w, c: x.c, d: x.d };
}

function inventoryNeedsAttunement(i, ref) {
  return Boolean(i.att || ref?.att);
}

function inventoryAttunementControl(i, ed) {
  return inventoryNeedsAttunement(i, inventoryCatalogItem(i, ed))
    ? `<input type="checkbox" data-rinv="attuned" data-iid="${esc(i.id)}" ${i.attuned ? "checked" : ""} aria-label="Attuned">`
    : '<span class="muted">—</span>';
}

function inventoryEffectActive(i, ref) {
  return +i.qty > 0 && i.eq && (!inventoryNeedsAttunement(i, ref) || i.attuned);
}

function inventorySpellStats(c, cls = c.spell?.cls || c.cls, stats = c.spell) {
  if (!stats || cls !== "Artificer") return stats;
  let bonus = 0;
  for (const item of c.inv || []) {
    if (!item.eq || !item.attuned || +item.qty <= 0) continue;
    const ref = inventoryCatalogItem(item, edOf(c));
    bonus = Math.max(bonus, ref?.artificerSpellBonus || 0);
  }
  return { ...stats, dc: stats.dc + bonus, atk: stats.atk + bonus };
}

function inventoryEnhancement(i, ref, target) {
  const rules = String(ref?.d || "");
  const match = target === "weapon"
    ? rules.match(/\+([1-3]) bonus to (?:weapon )?attack (?:rolls )?and damage rolls/i)
    : rules.match(/\+([1-3]) bonus to (?:Armor Class|AC)(?=\s*(?:[.,]|while))/i);
  const named = (String(i.n || "") + " " + (i.note || "")).match(/\+([1-3])\b/);
  return Number(match?.[1] || named?.[1] || 0);
}

function inventoryDetailsButton(i, label = "Item details") {
  return `<button class="btn sm" type="button" data-item-details="${esc(i.id)}" aria-label="${esc(label + (i.n ? " for " + i.n : ""))}">${esc(label)}</button>`;
}

function inventoryEffectsHTML(c) {
  const entries = (c.inv || []).flatMap(i => {
    if (!i.eq || +i.qty <= 0) return [];
    const ref = inventoryCatalogItem(i, edOf(c));
    if (!ref || ref.kind === "gear" || !ref.d || !inventoryEffectActive(i, ref)) return [];
    return [`<details><summary>${esc(i.n)}</summary>${spFormat(String(ref.d))}</details>`];
  });
  return entries.length ? `<div class="inventory-effects"><h4>Magic item effects</h4>${entries.join("")}</div>` : "";
}

function inventoryWeaponChoices(ref, ed) {
  if (ref?.cat !== "Weapon" && !/^Weapon\b/i.test(String(ref?.type || ""))) return [];
  const type = String(ref.type || "").toLowerCase();
  const qualifier = type.match(/^weapon\s*\(([^)]+)\)/)?.[1];
  const matches = IT.data[ed].filter(eqIsWeapon);
  const sword = x => /sword|rapier|scimitar/.test(x.n.toLowerCase());
  const axe = x => /axe/.test(x.n.toLowerCase());
  switch (qualifier) {
    case "any": return matches;
    case "any simple or martial": return matches.filter(x => /^(simple|martial) /i.test(x.cat));
    case "any melee weapon": return matches.filter(x => /\bmelee\b/i.test(x.cat));
    case "any ranged weapon": return matches.filter(x => /\branged\b/i.test(x.cat));
    case "any axe": return matches.filter(axe);
    case "any axe or sword": return matches.filter(x => axe(x) || sword(x));
    case "any sword": return matches.filter(sword);
    case "any sword that deals slashing damage":
      return matches.filter(x => sword(x) && x.st.some(([k, v]) => k === "Damage" && /slashing/i.test(v)));
    default: {
      if (!qualifier && /^weapon(?:,|$)/.test(type)) return matches;
      const names = (qualifier || "").split(/,\s*(?:or\s+)?|\s+or\s+/);
      return matches.filter(x => names.includes(x.n.toLowerCase()));
    }
  }
}

function inventoryArmorChoices(ref, ed) {
  const qualifier = String(ref?.type || "").toLowerCase().match(/^armor\s*\(([^)]+)\)/)?.[1];
  if (!qualifier) return [];
  const [included, excluded] = qualifier.replace(/^any\s+/, "").split(/,\s*(?:except|but not)\s+/);
  const names = included.split(/,\s*(?:or\s+)?|\s+or\s+/);
  const normalize = name => name.replace(/-/g, " ").replace(/ armor$/, "");
  return IT.data[ed].filter(x => {
    if (!eqIsArmor(x)) return false;
    const name = normalize(x.n.toLowerCase());
    return (!excluded || name !== normalize(excluded))
      && names.some(choice => normalize(choice) === name || choice === armorKind(x));
  });
}

function openInventoryDetails(c, i, trigger) {
  const ed = edOf(c), ref = inventoryCatalogItem(i, ed);
  const weapon = eqWeaponOf(i, ed), armor = eqArmorOf(i, ed);
  const stats = ref ? itStats({ ...ref, att: String(ref.att || "") }) : [];
  const selectedAttack = (c.attacks || []).find(a => a.iid === i.id);
  for (const gear of [weapon, armor]) {
    if (gear && gear !== ref) stats.push(...gear.st);
  }
  const enhancement = weapon ? inventoryEnhancement(i, ref, "weapon") : armor ? inventoryEnhancement(i, ref, "armor") : 0;
  if (selectedAttack) {
    stats.push(["Your attack", sgn(selectedAttack.hit) + " to hit"]);
    stats.push(["Your damage", selectedAttack.dmg + " " + selectedAttack.type]);
  }
  if (enhancement) stats.push(["Enhancement", "+" + enhancement + (weapon ? " to attack and damage" : " to AC")]);
  const needsAttunement = inventoryNeedsAttunement(i, ref);
  const status = +i.qty <= 0 ? "Quantity is zero" : !i.eq ? "Carried"
    : needsAttunement && !i.attuned ? "Equipped · awaiting attunement" : "Equipped";
  const weaponChoices = inventoryWeaponChoices(ref, ed);
  const armorChoices = inventoryArmorChoices(ref, ed);
  const choices = weaponChoices.length ? weaponChoices : armorChoices;
  const base = weaponChoices.length ? weapon : armor;
  const field = weaponChoices.length ? "baseWeapon" : "baseArmor";
  const dialog = characterReference(i.n || "Item details", `
    <p class="hint">${esc(status)}${needsAttunement ? " · Requires attunement" : ""}</p>
    ${choices.length > 1 ? `<label class="field">${weaponChoices.length ? "Base weapon" : "Base armor"}<select data-item-base><option value="">Choose base gear</option>${choices.map(x => `<option value="${esc(x.n)}" ${base?.n === x.n ? "selected" : ""}>${esc(x.n)}</option>`).join("")}</select></label>` : ""}
    <div class="sp-stats">${stats.filter(([, value]) => value !== "" && value != null).map(([label, value]) => `<div><span>${esc(label)}</span>${esc(value)}</div>`).join("")}</div>
    ${ref?.d ? spFormat(String(ref.d)) : !i.note ? '<p class="hint">No rules description is available for this item.</p>' : ""}
    ${i.note ? `<h3>Inventory notes</h3>${spFormat(String(i.note))}` : ""}`, trigger);
  $("[data-item-base]", dialog)?.addEventListener("change", e => {
    i[field] = e.target.value;
    pcPersist();
    renderRosterMain();
    const nextTrigger = $$("[data-item-details]", $("#rosterMain")).find(b => b.dataset.itemDetails === i.id);
    openInventoryDetails(c, i, nextTrigger);
    $("[data-item-base]", dialog)?.focus();
  });
}

$("#rosterMain").addEventListener("click", e => {
  const button = e.target.closest("[data-item-details]");
  if (!button) return;
  const c = rosterCur(), i = c?.inv?.find(x => x.id === button.dataset.itemDetails);
  if (i) openInventoryDetails(c, i, button);
});
