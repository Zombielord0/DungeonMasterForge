/* 2024 class feature names adapted from the SRD 5.2.1 class tables. */
const PROGRESSION_2024 = {
  Barbarian: {
    1: "Rage, Unarmored Defense, Weapon Mastery", 2: "Danger Sense, Reckless Attack", 3: "Barbarian Subclass, Primal Knowledge",
    5: "Extra Attack, Fast Movement", 7: "Feral Instinct, Instinctive Pounce", 9: "Brutal Strike",
    11: "Relentless Rage", 13: "Improved Brutal Strike", 15: "Persistent Rage",
    17: "Improved Brutal Strike", 18: "Indomitable Might", 20: "Primal Champion",
  },
  Bard: {
    1: "Bardic Inspiration, Spellcasting", 2: "Expertise, Jack of All Trades", 3: "Bard Subclass",
    5: "Font of Inspiration", 7: "Countercharm", 9: "Expertise",
    10: "Magical Secrets", 18: "Superior Inspiration", 20: "Words of Creation",
  },
  Cleric: {
    1: "Spellcasting, Divine Order", 2: "Channel Divinity", 3: "Cleric Subclass",
    5: "Sear Undead", 7: "Blessed Strikes", 10: "Divine Intervention",
    14: "Improved Blessed Strikes", 20: "Greater Divine Intervention",
  },
  Druid: {
    1: "Spellcasting, Druidic, Primal Order", 2: "Wild Shape, Wild Companion", 3: "Druid Subclass",
    5: "Wild Resurgence", 7: "Elemental Fury", 15: "Improved Elemental Fury",
    18: "Beast Spells", 20: "Archdruid",
  },
  Fighter: {
    1: "Fighting Style, Second Wind, Weapon Mastery", 2: "Action Surge (one use), Tactical Mind", 3: "Fighter Subclass",
    5: "Extra Attack, Tactical Shift", 9: "Indomitable (one use), Tactical Master", 11: "Two Extra Attacks",
    13: "Indomitable (two uses), Studied Attacks", 17: "Action Surge (two uses), Indomitable (three uses)", 20: "Three Extra Attacks",
  },
  Monk: {
    1: "Martial Arts, Unarmored Defense", 2: "Monk’s Focus, Unarmored Movement, Uncanny Metabolism", 3: "Deflect Attacks, Monk Subclass",
    4: "Slow Fall", 5: "Extra Attack, Stunning Strike", 6: "Empowered Strikes",
    7: "Evasion", 9: "Acrobatic Movement", 10: "Heightened Focus, Self-Restoration",
    13: "Deflect Energy", 14: "Disciplined Survivor", 15: "Perfect Focus",
    18: "Superior Defense", 20: "Body and Mind",
  },
  Paladin: {
    1: "Lay On Hands, Spellcasting, Weapon Mastery", 2: "Fighting Style, Paladin’s Smite", 3: "Channel Divinity, Paladin Subclass",
    5: "Extra Attack, Faithful Steed", 6: "Aura of Protection", 9: "Abjure Foes",
    10: "Aura of Courage", 11: "Radiant Strikes", 14: "Restoring Touch",
    18: "Aura Expansion",
  },
  Ranger: {
    1: "Spellcasting, Favored Enemy, Weapon Mastery", 2: "Deft Explorer, Fighting Style", 3: "Ranger Subclass",
    5: "Extra Attack", 6: "Roving", 9: "Expertise",
    10: "Tireless", 13: "Relentless Hunter", 14: "Nature’s Veil",
    17: "Precise Hunter", 18: "Feral Senses", 20: "Foe Slayer",
  },
  Rogue: {
    1: "Expertise, Sneak Attack, Thieves’ Cant, Weapon Mastery", 2: "Cunning Action", 3: "Rogue Subclass, Steady Aim",
    5: "Cunning Strike, Uncanny Dodge", 6: "Expertise", 7: "Evasion, Reliable Talent",
    11: "Improved Cunning Strike", 14: "Devious Strikes", 15: "Slippery Mind",
    18: "Elusive", 20: "Stroke of Luck",
  },
  Sorcerer: {
    1: "Spellcasting, Innate Sorcery", 2: "Font of Magic, Metamagic", 3: "Sorcerer Subclass",
    5: "Sorcerous Restoration", 7: "Sorcery Incarnate", 10: "Metamagic",
    17: "Metamagic", 20: "Arcane Apotheosis",
  },
  Warlock: {
    1: "Eldritch Invocations, Pact Magic", 2: "Magical Cunning", 3: "Warlock Subclass",
    9: "Contact Patron", 11: "Mystic Arcanum (level 6 spell)", 13: "Mystic Arcanum (level 7 spell)",
    15: "Mystic Arcanum (level 8 spell)", 17: "Mystic Arcanum (level 9 spell)", 20: "Eldritch Master",
  },
  Wizard: {
    1: "Spellcasting, Ritual Adept, Arcane Recovery", 2: "Scholar", 3: "Wizard Subclass",
    5: "Memorize Spell", 18: "Spell Mastery", 20: "Signature Spells",
  },
};

const SUBCLASS_MILESTONES = {
  Barbarian: [6, 10, 14], Bard: [6, 14], Cleric: [6, 8, 17], Druid: [6, 10, 14],
  Fighter: [7, 10, 15, 18], Monk: [6, 11, 17], Paladin: [7, 15, 20], Ranger: [7, 11, 15],
  Rogue: [9, 13, 17], Sorcerer: [6, 14, 18], Warlock: [6, 10, 14], Wizard: [6, 10, 14],
};

const PROGRESSION_2014_ADDITIONS = {
  Barbarian: { 13: "Brutal Critical (2 dice)", 17: "Brutal Critical (3 dice)" },
  Cleric: { 8: "Destroy Undead (CR 1)", 11: "Destroy Undead (CR 2)", 14: "Destroy Undead (CR 3)", 17: "Destroy Undead (CR 4)", 18: "Channel Divinity (three uses)", 20: "Divine Intervention improvement" },
  Druid: { 4: "Wild Shape improvement (swimming)", 8: "Wild Shape improvement (flying)" },
  Fighter: { 13: "Indomitable (two uses)", 17: "Action Surge (two uses), Indomitable (three uses)" },
  Monk: { 6: "Ki-Empowered Strikes", 9: "Unarmored Movement improvement", 13: "Tongue of the Sun and Moon", 15: "Timeless Body" },
  Paladin: { 18: "Aura improvements" },
  Sorcerer: { 10: "Metamagic option", 17: "Metamagic option" },
  Warlock: { 13: "Mystic Arcanum (level 7 spell)", 15: "Mystic Arcanum (level 8 spell)", 17: "Mystic Arcanum (level 9 spell)" },
};

const PROGRESSION_SUMMARIES = {
  "Ability Score Improvement": "Choose an ability score increase or an eligible feat.",
  "Epic Boon": "Choose an Epic Boon feat or another feat for which you qualify.",
  "Rage": "Enter a battle fury that bolsters Strength and protects you from certain damage.",
  "Second Wind": "Use a Bonus Action to recover Hit Points.",
  "Indomitable (one use)": "Reroll a failed saving throw and add your Fighter level to the new roll.",
  "Metamagic": "Spend Sorcery Points to alter how your spells work.",
  "Countercharm": "Help a creature reroll a failed save against being Charmed or Frightened.",
  "Favored Enemy": "Always prepare Hunter’s Mark and cast it a limited number of times without a spell slot.",
  "Foe Slayer": "Hunter’s Mark uses a d10 damage die.",
  "Stroke of Luck": "Once per Short or Long Rest, turn a failed D20 Test into a roll of 20.",
  "Archdruid": "Recover one Wild Shape use when you roll Initiative with none left, trade uses for a spell slot once per Long Rest, and age more slowly.",
  "Unarmored Defense": "Calculate Armor Class using Dexterity and your class’s other defensive ability when you meet the feature’s requirements.",
  "Extra Attack": "Attack twice when you take the Attack action.",
  "Spellcasting": "Prepare and cast spells using your class’s spell list.",
  "Weapon Mastery": "Choose weapons whose mastery properties you can use.",
  "Tactical Mind": "Spend a use of Second Wind to improve a failed ability check.",
  "Tactical Shift": "Move up to half your speed without provoking opportunity attacks when you use Second Wind.",
  "Tactical Master": "Replace a weapon's mastery property with Push, Sap, or Slow for an attack.",
  "Studied Attacks": "After missing a creature, gain advantage on your next attack against it before the end of your next turn.",
  "Two Extra Attacks": "Make three attacks when you take the Attack action.",
  "Three Extra Attacks": "Make four attacks when you take the Attack action.",
  "Innate Sorcery": "Temporarily raise your Sorcerer spell save DC and gain advantage on Sorcerer spell attacks.",
  "Sorcery Incarnate": "Use two Metamagic options on a spell during Innate Sorcery and spend Sorcery Points to regain use of it.",
  "Cunning Strike": "Trade Sneak Attack dice for effects such as poison, tripping, or withdrawing.",
  "Improved Cunning Strike": "Apply up to two Cunning Strike effects to the same Sneak Attack.",
  "Deft Explorer": "Gain expertise in a skill and learn two languages.",
  "Roving": "Gain climbing and swimming speeds and move faster outside heavy armor.",
  "Wild Companion": "Use Wild Shape or a spell slot to summon a familiar.",
  "Primal Order": "Choose martial training or enhanced druidic spellcraft.",
  "Divine Order": "Choose martial training or enhanced cleric spellcraft.",
  "Scholar": "Gain expertise in one scholarly skill you already know.",
  "Memorize Spell": "After a short rest, replace one prepared Wizard spell with another from your spellbook.",
  "Ritual Adept": "Cast qualifying rituals from your spellbook without preparing them.",
};

function progressionRows(ed, kind, name, option = "") {
  const rows = Array.from({ length: 20 }, () => []);
  const add = (level, title, desc = "") => {
    if (rows[level - 1] && title) rows[level - 1].push([title, desc]);
  };
  const C = kind === "class" && Object.hasOwn(CLASS_DATA, name) ? classData(ed, name) : null;
  if (C) {
    const revised = ed === "2024" && !C.hb;
    const ctx = { ed, cls: name };
    const choice = subclassLevel(ed, name);
    for (let level = 1; level <= 20; level++) {
      const revisedNames = PROGRESSION_2024[name]?.[level] || "";
      const additions = PROGRESSION_2014_ADDITIONS[name]?.[level] || "";
      const features = revised ? revisedNames.split(", ").filter(Boolean)
        : [...(C.f[level] || []), ...(!C.hb && additions ? additions.split(", ") : [])];
      features.filter(f => f !== C.sub[0] && f !== name + " Subclass" && !/^(Primal Path|Bard College|Divine Domain|Druid Circle|Martial Archetype|Monastic Tradition|Sacred Oath|Ranger Archetype|Roguish Archetype|Sorcerous Origin|Otherworldly Patron|Arcane Tradition)$/.test(f))
        .forEach(f => add(level, f, revised ? PROGRESSION_SUMMARIES[f] || FEAT_DESC_2024[f] || "" : featDesc(f, ctx) || PROGRESSION_SUMMARIES[f] || FEAT_DESC_2024[f] || ""));
      if (level === choice && subclassList(ed, name).length) add(level, "Choose a subclass");
      const milestones = name === "Cleric" && revised ? [6, 17] : SUBCLASS_MILESTONES[name];
      if (!C.hb && milestones?.includes(level)) add(level, "Subclass feature", "Select a subclass above to see the feature.");
      if ((C.asi || [4, 8, 12, 16, 19]).includes(level)) {
        const feature = (revised || C.hbx?.bookBase || C.hbx?.id === "reference-efota-artificer") && level === 19 ? "Epic Boon" : "Ability Score Improvement";
        add(level, feature, PROGRESSION_SUMMARIES[feature]);
      }
      if (name === "Rogue" && level % 2 === 1) add(level, "Sneak Attack damage", Math.ceil(level / 2) + "d6");
      if (name === "Monk" && [1, 5, 11, 17].includes(level)) {
        const die = (level >= 17 ? 10 : level >= 11 ? 8 : level >= 5 ? 6 : 4) + (revised ? 2 : 0);
        add(level, "Martial Arts die", "1d" + die);
      }
      const casting = C.cast?.[0];
      if (casting === "pact") {
        const slots = pactSlots(level);
        add(level, "Pact Magic slots", slots.n + " × level " + slots.lvl);
      } else if (casting === "full" || casting === "artificer" || (casting === "half" && level >= (ed === "2024" ? 1 : 2))) {
        const slots = casting === "artificer" ? ARTIFICER_SLOTS[level] : FULL_SLOTS[casting === "full" ? level : Math.ceil(level / 2)];
        add(level, "Spell slots by spell level", slots.join(" / "));
      }
    }
  } else if (kind === "subclass") {
    const features = subclassFeatureRows(ed,name,option,false).map(f=>[f.l,f.n,(f.d||"")+fxNote(f.fx)]);
    for (const [level, feature, desc] of features) add(level, feature, desc);
    if (subCaster(name,option,ed)) {
      for (let level = subclassLevel(ed, name); level <= 20; level++) {
        const slots = thirdSlots(level);
        if (slots?.length) add(level, "Spell slots by spell level", slots.join(" / "));
      }
    }
  } else if (kind === "species" && Object.hasOwn(PC_RACES[ed], name)) {
    const R = raceInfo(ed, name, option);
    const { feats, hidden } = raceLevelFeats(ed, name, R.traits, 20);
    const ctx = { ed, race: name, ancestry: option };
    const lineage = PC_RACES[ed][name].subs?.[option];
    if (lineage?.d) add(1, subLabel(ed, name, option), lineage.d);
    add(1, "Walking speed", R.speed + " ft");
    if (ed === "2014") {
      const bonuses = Object.entries(R.asi).map(([ability, score]) => "+" + score + " " + AB_FULL[ability]);
      if (R.plus1) bonuses.push("+1 to " + R.plus1 + " other ability score(s)");
      if (bonuses.length) add(1, "Ability score increases", bonuses.join(", "));
    }
    for (const trait of new Set(R.traits)) {
      if (!hidden.has(trait)) add(1, trait, featDesc(trait, ctx));
    }
    for (const feature of feats) add(feature.l, feature.f, featDesc(feature.f, ctx));
    if (ed === "2024" && name === "Dragonborn") {
      add(5, "Breath Weapon damage", "2d10");
      add(11, "Breath Weapon damage", "3d10");
      add(17, "Breath Weapon damage", "4d10");
    }
  }
  return rows;
}

let characterReferenceTrigger;
function characterReference(title, html, trigger, onNext) {
  let dialog = $("#characterReference");
  if (!dialog) {
    document.body.insertAdjacentHTML("beforeend", '<dialog id="characterReference" class="character-reference" aria-labelledby="characterReferenceTitle"><div class="character-reference-heading"><h2 id="characterReferenceTitle"></h2><div class="reference-actions"><button type="button" class="btn sm" autofocus>Close</button><button type="button" class="btn sm primary" data-reference-next hidden>Next →</button></div></div><div class="character-reference-body"></div></dialog>');
    dialog = $("#characterReference");
    $("button", dialog).addEventListener("click", () => dialog.close());
    dialog.addEventListener("keydown", event => {
      if (event.key === "Escape") event.stopPropagation();
    });
    dialog.addEventListener("close", () => {
      if (!dialog.open && characterReferenceTrigger?.isConnected) characterReferenceTrigger.focus({ preventScroll: true });
    });
  }
  $("#characterReferenceTitle").textContent = title;
  $(".character-reference-body", dialog).innerHTML = html;
  characterReferenceTrigger = trigger;
  const next = $("[data-reference-next]", dialog);
  next.hidden = !onNext;
  next.disabled = false;
  next.onclick = onNext ? () => {
    characterReferenceTrigger = null;
    dialog.close();
    onNext();
  } : null;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  return dialog;
}

function progressionButton(ed, kind, name, option = "", label = "Level 1–20 preview") {
  return `<button type="button" class="btn sm" data-progression="${kind}" data-progression-ed="${esc(ed)}" data-progression-name="${esc(name)}" data-progression-option="${esc(option)}" aria-label="${esc(label + (name ? " for " + (kind === "subclass" ? option : name) : ""))}">${esc(label)}</button>`;
}

function openProgression(ed, kind, name, option, trigger, { setLineage, requireLineage, campaign = false, onNext } = {}) {
  if (kind === "class" && !classList(ed).includes(name) || kind === "species" && !Object.hasOwn(PC_RACES[ed], name)) {
    toast("Choose a class or species first");
    return;
  }
  const choices = kind === "class" ? (campaign ? campaignSubclassChoices(ed, name) : subclassList(ed, name))
    : kind === "species" ? (campaign || setLineage ? campaignLineageChoices(ed, name) : Object.keys(PC_RACES[ed][name].subs || {})).map(key => [key, subLabel(ed, name, key)]) : [];
  const builtIn = kind === "class" && !classData(ed, name).hb;
  const source = ed === "2024" ? "5.2.1" : "5.1";
  const species = kind === "species" ? PC_RACES[ed][name] : null;
  const subclass = kind === "subclass" ? (campaign ? campaignSubclassChoices(ed, name) : subclassList(ed, name)).find(([key]) => key === option) : null;
  const sourceName = species?.src || subclass?.[3] || (kind === "class" ? classData(ed, name).hbx?.src : "");
  const attribution = sourceName ? dmBook(sourceName).name : species?.hb || subclass?.[2] ? "Homebrew" : "";
  const lineageLabel = species?.term || (ed === "2024" ? "Lineage" : "Subrace");
  const options = choices.map(([key, label, custom, book]) => {
    const labelText = kind === "class" ? key + (book ? " · " + dmBook(book).name : custom ? " · Homebrew" : "") : label;
    return `<option value="${esc(key)}"${key === option ? " selected" : ""}>${esc(labelText)}</option>`;
  }).join("");
  const title = kind === "subclass" ? option + " progression" : name + " progression";
  const dialog = characterReference(title, `
    <p class="hint">${esc(ed)} rules · Levels 1–20${kind === "species" ? " by character level" : " by class level"}</p>
    ${species && RACE_DESC[name] ? `<p>${esc(RACE_DESC[name])}</p>` : ""}
    ${attribution ? `<p class="hint">${esc(attribution)}</p>` : ""}
    ${subclass?.[1] ? `<p>${esc(subclass[1])}</p>` : ""}
    ${options ? `<label class="field">${kind === "class" ? "Compare a subclass" : esc(lineageLabel)}<select data-progression-compare>${requireLineage ? "" : `<option value="">${kind === "class" ? "Class only" : setLineage ? "Random" : "Base species"}</option>`}${options}</select></label>` : ""}
    <p class="hint" data-progression-description hidden></p>
    <div data-progression-rows></div>
    ${builtIn ? `<p class="hint">Class progression adapted from the System Reference Document ${source} by Wizards of the Coast LLC, available at <a href="https://www.dndbeyond.com/srd">dndbeyond.com/srd</a>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/legalcode">CC BY 4.0</a>. The table is a planning reference.</p>` : ""}`, trigger, onNext);
  const render = selected => {
    const rows = progressionRows(ed, kind, name, kind === "class" ? "" : selected);
    if (kind === "class" && selected) {
      progressionRows(ed, "subclass", name, selected).forEach((features, i) => {
        if (features.length) rows[i] = [...rows[i].filter(([f]) => f !== "Subclass feature"), ...features];
      });
    }
    const description = $("[data-progression-description]", dialog);
    description.textContent = kind === "class" ? choices.find(([key]) => key === selected)?.[1] || "" : "";
    description.hidden = !description.textContent;
    $("[data-progression-rows]", dialog).innerHTML = `<table class="progression-table"><thead><tr><th scope="col">Level</th><th scope="col">Features and abilities</th></tr></thead><tbody>${rows.map((features, i) => `<tr><th scope="row">${i + 1}</th><td>${features.length ? features.map(([f, d]) => `<div><strong>${esc(f)}</strong>${d ? ` <span class="muted">${esc(d)}</span>` : ""}</div>`).join("") : '<span class="muted">—</span>'}</td></tr>`).join("")}</tbody></table>`;
  };
  const select = $("[data-progression-compare]", dialog);
  const next = $("[data-reference-next]", dialog);
  if (onNext && requireLineage && species?.subs) next.disabled = !select?.value;
  if (select) select.addEventListener("change", () => {
    if (setLineage) setLineage(select.value);
    if (onNext && requireLineage) next.disabled = !select.value;
    render(select.value);
  });
  render(select ? select.value : option);
}

function backgroundDescription(ed, name) {
  return (HB_BG[name]?.desc ?? (ed === "2024" ? BG_DESC_2024[name] : BG_DESC[name])) || "";
}

function openBackgroundReference(ed, name, trigger, { gold, setGold, onNext } = {}) {
  const background = bgInfo(ed, name);
  if (!background || !bgList(ed).includes(name)) {
    toast("Choose a background first");
    return;
  }
  const description = backgroundDescription(ed, name);
  const homebrew = HB_BG[name];
  const source = homebrew ? homebrew.src ? dmBook(homebrew.src).name : "Homebrew" : "";
  const showEquipment = setGold && ed === "2024" && !homebrew;
  const dialog = characterReference(name + " background", `
    <p class="hint">${esc(ed)} rules${source ? " · " + esc(source) : ""}</p>
    ${description ? `<p>${esc(description)}</p>` : ""}
    <dl class="reference-details">${bgLines(ed, name).map(([label, value]) => `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join("")}</dl>
    ${showEquipment ? `<div class="seg" role="radiogroup" aria-label="Starting equipment">
      <label class="opt"><input type="radio" name="cbGold" value="kit" ${gold ? "" : "checked"}><span>Take the equipment and ${background.gp || 0} gp</span></label>
      <label class="opt"><input type="radio" name="cbGold" value="gold" ${gold ? "checked" : ""}><span>Take 50 gp instead</span></label>
    </div>` : ""}`, trigger, onNext);
  if (showEquipment) $$('input[name="cbGold"]', dialog).forEach(input => {
    input.addEventListener("change", () => setGold(input.value === "gold"));
  });
}

document.addEventListener("click", e => {
  const b = e.target.closest("[data-progression]");
  if (!b) return;
  const { progression: kind, progressionEd, progressionName, progressionOption } = b.dataset;
  const ed = progressionEd || $('input[name="pcEd"]:checked')?.value || "2024";
  if (kind === "background") {
    openBackgroundReference(ed, $("#pcBg").value, b, { onNext: () => focusForgeField("background") });
    return;
  }
  const name = progressionName || $(kind === "class" ? "#pcClass" : "#pcRace").value;
  const option = progressionOption || (!progressionEd && kind === "species" ? $("#pcAnc").value : "");
  const settings = !progressionEd ? {
    campaign: true,
    setLineage: kind === "species" ? setForgeLineage : undefined,
    onNext: () => focusForgeField(kind),
  } : kind === "subclass" && b.closest("#lvModal") ? {
    campaign: true,
    onNext: () => lvAdvanceSubclass(option),
  } : undefined;
  openProgression(ed, kind, name, option, b, settings);
});
