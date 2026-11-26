/* 02-adventure.js: The Generate tab: adventure generator, chapter briefs and how an adventure is drawn. */

/* ======================= Adventure generator ======================= */
function themeList(s) {
  const t = [];
  if (s.focus.includes("combat")) t.push("combat");
  if (s.focus.includes("espionage")) t.push("espionage");
  if (s.focus.includes("mixed")) t.push("combat", "espionage", "exploration");
  if (s.focus.includes("other")) {
    if (s.other.length) t.push(...s.other);
    else if (!s.custom) t.push("mystery");
  }
  if (!t.length) t.push("combat", "espionage", "exploration");
  return [...new Set(t)];
}

function generateAdventure(s) {
  const off = s.offsets || {};
  const R = sec => makeRng(s.seed, sec, off[sec] || 0);
  const themes = themeList(s);
  const mid = Math.round((s.min + s.max) / 2);
  const out = { seed: s.seed, settings: JSON.parse(JSON.stringify(s)), themes };

  // ---- core
  let r = R("core");
  const primary = r.pick(themes); const T = THEMES[primary];
  const settingKey = s.setting || r.pick(Object.keys(SETTINGS));
  const vName = fullName(r);
  const core = {
    place: placeName(r), region: SETTINGS[settingKey][1], regionLabel: SETTINGS[settingKey][0], primary,
    villain: { name: vName, archetype: r.pick(T.villains), motive: r.pick(MOTIVES) },
    faction: "The " + r.pick(FAC_A) + " " + r.pick(FAC_N)
  };
  core.premise = fill(r.pick(T.premise), { villain: vName, place: core.place, faction: core.faction });
  const titleForms = [
    () => `The ${r.pick(T.nouns)} of ${core.place}`, () => `The ${r.pick(TITLE_ADJ)} ${r.pick(T.nouns)}`,
    () => `${vName.split(" ")[1]}'s ${r.pick(T.nouns)}`, () => `Shadows over ${core.place}`
  ];
  core.title = r.pick(titleForms)();
  core.objective = r.pick(T.objectives);
  out.core = core;
  const ctx = { villain: vName, place: core.place, faction: core.faction };

  // ---- factions
  r = R("factions");
  const facs = [{ name: core.faction, goal: r.pick(FAC_GOALS), attitude: r.pick(["Unknown", "Neutral", "Rival"]) }];
  const nf = s.format === "oneshot" ? 1 : 2;
  for (let i = 0; i < nf; i++) facs.push({ name: "The " + r.pick(FAC_A) + " " + r.pick(FAC_N), goal: r.pick(FAC_GOALS), attitude: r.pick(ATTITUDES) });
  out.factions = facs;

  // ---- NPCs
  r = R("npcs");
  const nn = s.format === "oneshot" ? 3 : 5;
  const roles = r.pickN(ROLES, nn);
  out.npcs = roles.map(role => ({ name: fullName(r), race: r.pick(RACES), role, trait: r.pick(TRAITS), secret: r.pick(SECRETS) }));
  ctx.npc = out.npcs[0].name;

  // ---- locations
  r = R("locations");
  const nl = s.format === "oneshot" ? 3 : 5;
  out.locations = r.pickN(SITES, nl).map(([type, map]) => ({ name: (r.chance(.5) ? "The " : "") + placeName(r) + " " + cap1(type.split(" ").pop().replace(/'s$/, "")), type, desc: r.pick(SITE_DESC), mapTheme: map }));
  out.locations.forEach(l => { l.name = l.name.replace(/\s+/g, " "); });

  // ---- twist & hooks
  r = R("twist"); out.twist = r.pick(TWISTS);
  r = R("hooks"); out.hooks = r.pickN(HOOKS, 4).map(h => fill(h, ctx));

  // ---- rewards
  r = R("rewards");
  const tier = tierOf(s.max);
  const gold = [[100, 600], [1000, 6000], [8000, 40000], [50000, 250000]][tier];
  out.rewards = { items: r.pickN(REWARDS[tier], 3), gold: Math.round(r.int(gold[0], gold[1]) / 50) * 50 };

  // ---- outline
  r = R("outline");
  const party = s.party;
  const locTags = l => TAGMAP[l.mapTheme];
  if (s.format === "oneshot") {
    const lv = mid, L = out.locations;
    const sc1 = r.pick(THEMES[r.pick(themes)].scenes), sc2 = r.pick(THEMES[r.pick(themes)].scenes);
    out.outline = {
      kind: "oneshot", level: lv,
      scenes: [
        { title: "The Hook", text: `${out.npcs[0].name}, a ${out.npcs[0].race} ${out.npcs[0].role}, finds the party and lays out the problem: ${core.premise} Goal: ${core.objective.toLowerCase()}.` },
        { title: "Into the Field", text: `Lead the party to ${L[0].name} (a ${L[0].type}, ${L[0].desc}). Set piece: ${sc1}.`, enc: buildEncounter(r, lv, party, "medium", locTags(L[0])), loc: 0 },
        { title: "Complication", text: `Things go sideways: ${sc2}. ${out.npcs[1].name} offers help, but ${out.npcs[1].secret.replace(/^secretly /, "secretly ")}. Drop a clue to the twist.`, enc: buildEncounter(r, lv, party, r.pick(["easy", "medium"]), locTags(L[1])), loc: 1 },
        { title: "The Lair", text: `The trail ends at ${L[2].name}, a ${L[2].type} ${L[2].desc}. Generate its map from the Locations section.`, enc: buildEncounter(r, lv, party, "hard", locTags(L[2])), loc: 2 },
        { title: "Climax", text: `Confront ${core.villain.name}, ${core.villain.archetype} who ${core.villain.motive}. Reveal the twist if it hasn't landed yet.`, enc: buildClimax(r, lv, party, locTags(L[2]), core.villain.name) },
        { title: "Resolution", text: `Pay out the rewards, then let the party decide what happens to ${core.place}. Leave one loose thread for a sequel.` }
      ]
    };
  } else {
    const span = s.max - s.min;
    const n = clamp(Math.ceil(span / 2) + 2, 3, 10);
    const chapters = [];
    for (let i = 0; i < n; i++) {
      const lv = Math.round(s.min + span * (n === 1 ? 0 : i / (n - 1)));
      const next = i < n - 1 ? Math.round(s.min + span * ((i + 1) / (n - 1))) : null;
      const th = THEMES[themes[i % themes.length]];
      const loc = i === n - 1 ? out.locations[out.locations.length - 1] : out.locations[i % out.locations.length];
      const ch = {
        title: `The ${r.pick(TITLE_ADJ)} ${r.pick(CH_NOUN)}`, level: lv, theme: th.label,
        location: loc.name, loc: out.locations.indexOf(loc),
        goal: r.pick(th.objectives), scene: r.pick(th.scenes),
        milestone: next && next > lv ? `Party reaches level ${next}` : null, note: ""
      };
      if (i === 0) ch.note = `Introduce ${out.factions[0].name} and ${out.npcs[0].name}.`;
      if (i === Math.floor(n / 2)) ch.note = "Reveal the twist here.";
      if (i === n - 1) { ch.goal = `Defeat ${core.villain.name} and ${core.objective.toLowerCase()}`; ch.enc = buildClimax(r, lv, party, TAGMAP[loc.mapTheme], core.villain.name); }
      else ch.enc = buildEncounter(r, lv, party, r.pick(["medium", "hard", "hard"]), TAGMAP[loc.mapTheme]);
      chapters.push(ch);
    }
    out.outline = { kind: "campaign", chapters, sessions: `${n * 2}–${n * 4}` };
  }
  return out;
}

/* ======================= Chapter briefs (in-depth chapter notes) ======================= */
function encLine(e) { return e ? `${e.text}. Difficulty: ${e.rating}, adjusted XP ${e.adj.toLocaleString()}` : ""; }
function chapterBrief(g, i) {
  const o = g.outline, ch = o.chapters[i], n = o.chapters.length, c = g.core, V = c.villain;
  const L = g.locations, N = g.npcs, F = g.factions;
  const loc = L[ch.loc] || L[0], prev = i > 0 ? o.chapters[i - 1] : null, next = o.chapters[i + 1] || null;
  const a1 = Math.ceil(n / 3), a2 = Math.ceil(2 * n / 3), mid = Math.floor(n / 2);
  const last = i === n - 1, first = i === 0, isMid = i === mid && !first && !last;
  const act = i < a1 ? "I" : i < a2 ? "II" : "III";
  const npc = N[i % N.length], ally = N[(i + 2) % N.length], fac = F[i % F.length];
  const pastMid = i >= mid;
  const out = [];
  let ov;
  if (first) ov = `Opening chapter (Act I). ${N[0].name}, a ${N[0].race} ${N[0].role}, pulls the party into the trouble around ${c.place}: ${c.premise} Use this chapter to set the stakes, introduce ${F[0].name}, and give the players a reason to care about ${c.place} before things get worse. ${V.name} should be only a rumor or a name whispered in fear, never a face yet.`;
  else if (last) ov = `Finale (Act III). Everything converges on ${loc.name}, where ${V.name} makes a last stand. The party should arrive carrying the allies, clues and leverage they earned in earlier chapters, so reward that preparation with real tactical advantages. Win or lose, this chapter answers the campaign's central question: can they ${lc1(c.objective)}?`;
  else if (isMid) ov = `Midpoint and turning point (Act ${act}). The party's understanding of the conflict is turned upside down when the twist lands. From here the heroes stop reacting to ${V.name}'s plan and start hunting it down.`;
  else if (act === "I") ov = `Act I, rising action. The party digs deeper into what is happening around ${c.place}, makes its first real allies and enemies, and learns the problem is far bigger than it first looked. ${V.name}'s agents start noticing the party's interference.`;
  else if (act === "II") ov = `Act II, escalation. ${V.name} now knows the party by name and moves against them directly. The threat spreads beyond ${c.place}; put something or someone the party cares about at real risk so the stakes feel personal.`;
  else ov = `Act III, the run-up to the finale. ${V.name}'s plan is nearly complete. This chapter is about securing the last thing the party needs (a weapon, an ally, a way in, or a weakness) before the final assault.`;
  out.push("OVERVIEW: " + ov);
  out.push(`GOAL: ${cap1(ch.goal)}.`);
  out.push(`LOCATION: ${loc.name}, ${aAn(loc.type)} ${loc.type}, ${loc.desc}. On arrival, describe one sight, one sound and one smell, and show signs that ${first ? "something is wrong here" : V.name + "'s people were here recently"}. Generate a battle map for it from the Locations section.`);
  out.push("GETTING THERE: " + (first
    ? `Open with a player hook (see Player Hooks), then have ${N[0].name} meet the party, explain the danger and point them toward ${loc.name}.`
    : `Pick up from Chapter ${i}'s ending. The clues found at ${o.chapters[i - 1].location} lead here; open in motion (on the road, mid-chase or already at the gate) rather than with a recap.`));
  out.push(`SET PIECE: ${cap1(ch.scene)}. This is the chapter's centerpiece. Give the players at least two ways through it (force, talk or stealth), and let their choice change what they find afterward.`);
  out.push(`KEY NPC: ${npc.name} (${npc.race} ${npc.role}), who ${npc.trait}. Secret: ${npc.name.split(" ")[0]} ${npc.secret}. ` + (pastMid
    ? `The secret can come out in this chapter; decide whether it helps or hurts the party, and make the reveal a choice they have to react to.`
    : `Don't reveal the secret yet; drop one small hint (a slip of the tongue, an odd reaction or a mismatched detail) that sharp players can catch.`)
    + (ally !== npc ? ` ${ally.name} (${ally.role}) can appear as a secondary contact who offers help or information for a price.` : ""));
  out.push(`FACTION PRESSURE: ${fac.name} (${fac.attitude.toLowerCase()} toward the party) wants to ${fac.goal}. ` + (first
    ? `Introduce them here through a representative who sizes the party up and hints that their interests may line up, for now.`
    : last ? `They show up at the end: as reinforcements if the party treated them well, or to grab the spoils if not.`
    : `They are pursuing their own agenda in the same place; have them offer a deal, get in the way, or compete for the same prize.`));
  if (ch.enc) out.push(`${ch.enc.climax ? "BOSS ENCOUNTER" : "ENCOUNTER"}: ${encLine(ch.enc)}. ` + (last
    ? `Give ${V.name} a speech that ties back to their motive (${V.name} ${V.motive}), and change the battlefield halfway through the fight.`
    : `Use the terrain of ${loc.name}; give enemies a goal beyond "kill the party" (escape with a prisoner, destroy evidence, raise an alarm).`));
  const clues = [];
  if (next) clues.push(`a lead pointing to ${next.location}, where Chapter ${i + 2} takes place`);
  if (!last) clues.push(pastMid ? `a weakness or vulnerability of ${V.name}` : `evidence that someone powerful is behind events (${V.name}'s sigil, letter or agent)`);
  if (i < mid) clues.push(`a small detail that foreshadows the twist without giving it away`);
  if (i % 2 === 1 && g.hooks[i % g.hooks.length]) clues.push(`a moment that ties to a party member's personal hook`);
  if (clues.length) out.push("CLUES TO PLANT: " + clues.map((x, k) => `(${k + 1}) ${x}`).join("; ") + ".");
  if (isMid) out.push(`TWIST REVEAL: ${g.twist} Stage it as a discovery the players make themselves (a document, a confession or a scene they witness) rather than something an NPC simply tells them.`);
  if (ch.note && !isMid) out.push(`NOTE: ${ch.note}`);
  if (!last) out.push(`VILLAIN'S MOVE: While the party is here, ${V.name} ${["quietly moves pieces into place and removes a witness", "sends agents to shadow the party and report back", "strikes somewhere the party just left, showing their reach", "makes the party an offer: walk away and be rewarded", "advances the plan and something irreversible happens off-screen", "turns one of the party's allies or puts them in danger"][i % 6]}. Keep their motive in mind when deciding how they react: ${V.name} ${V.motive}.`);
  out.push(last
    ? `OUTCOME: Success: the party will ${lc1(c.objective)}. Pay out the rewards (${g.rewards.items.join(", ")}, plus ${g.rewards.gold.toLocaleString()} gp) and give every surviving NPC and faction an epilogue line. Failure or a costly win: decide what ${c.place} looks like under ${V.name}'s shadow, which is a hook for a sequel.`
    : `OUTCOME: Success: the party will ${lc1(ch.goal)} and leave with the lead to ${next.location}. Failure or retreat: they still get the lead, but at a cost (an ally hurt, a resource lost, or ${V.name} a step further ahead).`);
  if (ch.milestone) out.push(`MILESTONE: ${ch.milestone} at the end of this chapter.`);
  out.push(`PACING: ${last ? "Plan 2–3 sessions; let the final fight breathe." : "Plan about 2–4 sessions."} Tone (${g.settings.tone}): ${TONE_TIPS[g.settings.tone] || "play to the table."}`);
  return out.join("\n\n");
}
function sceneBrief(g, i) {
  const sc = g.outline.scenes[i], V = g.core.villain, L = g.locations;
  const tips = [
    `Play ${g.npcs[0].name} (${g.npcs[0].trait}) as worried but holding something back. Let each player ask one question before the party sets out. Pick a Player Hook to tie at least one character in personally.`,
    `Describe ${L[0] ? L[0].name : "the site"} with one sight, sound and smell. Offer at least two ways through the set piece. Hide a clue that points toward ${L[1] ? L[1].name : "the next location"}.`,
    `${g.npcs[1].name} ${g.npcs[1].trait}. Their secret (${g.npcs[1].name.split(" ")[0]} ${g.npcs[1].secret}) should colour how they help. This is the place to foreshadow the twist: ${g.twist}`,
    `Generate the map for ${L[2] ? L[2].name : "the lair"} and add one hazard or trap that rewards caution. The party should learn something about ${V.name}'s plan here before the final fight.`,
    `${V.name} ${V.motive}. Give them a short speech, then change the battlefield halfway through the fight. If the twist hasn't landed yet, reveal it now.`,
    `Hand out rewards: ${g.rewards.items.join(", ")}, plus ${g.rewards.gold.toLocaleString()} gp. Give each NPC an epilogue line and leave one thread unresolved for a sequel.`
  ];
  return [sc.text, sc.enc ? `${sc.enc.climax ? "BOSS ENCOUNTER" : "ENCOUNTER"}: ${encLine(sc.enc)}.` : "", tips[i] ? "DM TIPS: " + tips[i] : ""].filter(Boolean).join("\n\n");
}
const aAn = w => /^[aeiou]/i.test(String(w)) ? "an" : "a";
function lc1(s) { s = String(s || ""); return s.charAt(0).toLowerCase() + s.slice(1); }
function autoGrow(t) { if (!t || t.tagName !== "TEXTAREA") return; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight + 4, 900) + "px"; }

/* ======================= Adventure rendering ======================= */
function encHTML(e) { if (!e) return ""; return `<div class="enc">${e.climax ? "<b>Boss:</b> " : "<b>Encounter:</b> "}${esc(e.text)}<span class="r ${e.rating}">${e.rating}</span> <span class="muted" style="font-size:13px">adj. XP ${e.adj.toLocaleString()}</span></div>`; }
function secHead(title, key, rerolls) { return `<div class="sec-h"><h3>${title}</h3><span class="sp"></span>${rerolls ? `<button class="icon-btn" data-reroll="${key}" title="Reroll this section">↻ Reroll</button>` : ""}</div>`; }
function renderAdventure(g, opts = {}) {
  const s = g.settings, c = g.core, rr = !!opts.rerolls;
  const themeTags = g.themes.map(t => `<span class="tag">${esc(THEMES[t].label)}</span>`).join("") + (s.custom ? `<span class="tag">${esc(s.custom)}</span>` : "");
  let h = `<div class="card">${rr ? `<div class="sec-h" style="margin:0"><span class="sp"></span><button class="icon-btn" data-reroll="core" title="Reroll title, premise and villain">↻ Reroll core</button></div>` : ""}
    <div class="gen-title">${esc(c.title)}</div>
    <div class="gen-sub"><span class="tag gold">${s.format === "oneshot" ? "One-shot" : "Campaign"}</span><span class="tag gold">Levels ${s.min}–${s.max}</span><span class="tag">Party of ${s.party}</span><span class="tag">${esc(s.tone)}</span><span class="tag">${esc(c.regionLabel)}</span>${themeTags}</div>
    <p class="premise">${esc(c.premise)}</p>
    <p><b>Setting:</b> ${esc(cap1(c.region))}, centered on <b>${esc(c.place)}</b>.</p>
    <p><b>Villain:</b> ${esc(c.villain.name)}, ${esc(c.villain.archetype)} who ${esc(c.villain.motive)}.</p>
    <p><b>Main objective:</b> ${esc(c.objective)}.</p>
    ${s.custom ? `<p><b>Your theme:</b> weave “${esc(s.custom)}” into the villain's plan and at least one location.</p>` : ""}
    <p class="muted"><i>Tone (${esc(s.tone)}):</i> ${esc(TONE_TIPS[s.tone] || "")}</p>
    ${opts.saveBtn ? `<div class="row" style="justify-content:flex-start;gap:8px;margin-top:8px"><button class="btn primary" id="saveCampaign" style="flex:0 0 auto">Save to Campaign Tracker</button></div>` : ""}
  </div>`;

  // outline
  const o = g.outline;
  h += `<div class="sec">${secHead(o.kind === "oneshot" ? `Session Outline <span class="lvl">Balanced for level ${o.level}</span>` : `Campaign Arc <span class="muted" style="font-family:Crimson Pro;font-size:14px;font-weight:400;letter-spacing:0">· ${o.chapters.length} chapters · about ${o.sessions} sessions</span>`, "outline", rr)}`;
  if (o.kind === "oneshot") {
    h += `<ol class="scenes">${o.scenes.map(sc => `<li><div class="scene-t">${esc(sc.title)}</div><div>${esc(sc.text)}</div>${encHTML(sc.enc)}<details class="brief"><summary>Full scene brief</summary><div>${esc(sceneBrief(g, o.scenes.indexOf(sc))).replace(/\n\n/g, "</p><p>").replace(/^/, "<p>").replace(/$/, "</p>").replace(/<p>([A-Z][A-Z' ]+):/g, "<p><b>$1:</b>")}</div></details></li>`).join("")}</ol><p class="hint">Expect roughly 3–4 hours of play.</p>`;
  } else {
    const n = o.chapters.length, a1 = Math.ceil(n / 3), a2 = Math.ceil(2 * n / 3);
    h += `<ol class="scenes">`;
    o.chapters.forEach((ch, i) => {
      if (i === 0) h += `<div class="act">Act I · Setup</div>`;
      if (i === a1 && a1 < n) h += `<div class="act">Act II · Confrontation</div>`;
      if (i === a2 && a2 < n && a2 !== a1) h += `<div class="act">Act III · Resolution</div>`;
      h += `<li><div class="scene-t">Chapter ${i + 1}: ${esc(ch.title)}<span class="lvl">Lv ${ch.level}</span></div>
        <div><b>Goal:</b> ${esc(ch.goal)}. <b>Where:</b> ${esc(ch.location)}. <b>Set piece:</b> ${esc(ch.scene)}.</div>
        ${ch.note ? `<div class="muted"><i>${esc(ch.note)}</i></div>` : ""}
        ${encHTML(ch.enc)}
        <details class="brief"><summary>Full chapter brief</summary><div>${esc(chapterBrief(g, i)).replace(/\n\n/g, "</p><p>").replace(/^/, "<p>").replace(/$/, "</p>").replace(/<p>([A-Z][A-Z' ]+):/g, "<p><b>$1:</b>")}</div></details>
        ${ch.milestone ? `<div class="hint">★ Milestone: ${esc(ch.milestone)}</div>` : ""}</li>`;
    });
    h += `</ol>`;
  }
  h += `</div>`;

  // NPCs
  h += `<div class="sec">${secHead("Key NPCs", "npcs", rr)}<div class="grid2">${g.npcs.map(n => `<div class="mini"><h4>${esc(n.name)}</h4><div class="k">${esc(n.race)} ${esc(n.role)}</div><div>Quirk: ${esc(n.trait)}.</div><div class="muted">Secret: ${esc(n.secret)}.</div></div>`).join("")}</div></div>`;
  // Locations
  h += `<div class="sec">${secHead("Locations", "locations", rr)}<div class="grid2">${g.locations.map((l, i) => `<div class="mini"><h4>${esc(l.name)}</h4><div class="k">${esc(cap1(l.type))}, ${esc(l.desc)}</div><button class="btn sm" style="margin-top:8px" data-mkmap="${i}">🗺 Generate map</button></div>`).join("")}</div></div>`;
  // Factions
  h += `<div class="sec">${secHead("Factions", "factions", rr)}<div class="grid2">${g.factions.map(f => `<div class="mini"><h4>${esc(f.name)}</h4><div class="k">${esc(f.attitude)}</div><div>Wants to ${esc(f.goal)}.</div></div>`).join("")}</div></div>`;
  // Twist / hooks / rewards
  h += `<div class="grid2" style="margin-top:0">
    <div class="sec">${secHead("Twist", "twist", rr)}<div>${esc(g.twist)}</div></div>
    <div class="sec">${secHead("Rewards", "rewards", rr)}<ul class="plain">${g.rewards.items.map(x => `<li>${esc(x)}</li>`).join("")}<li>${g.rewards.gold.toLocaleString()} gp in coin and valuables</li></ul></div>
  </div>
  <div class="sec">${secHead("Player Hooks", "hooks", rr)}<ul class="plain">${g.hooks.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
  return h;
}

/* ======================= Generator UI ======================= */
let currentGen = null;
(function initGenForm() {
  const sel = $("#setting");
  Object.entries(SETTINGS).forEach(([k, v]) => sel.insertAdjacentHTML("beforeend", `<option value="${k}">${esc(v[0])}</option>`));
  const syncPreset = () => { const r = `${$("#lvlMin").value}-${$("#lvlMax").value}`; $$("#lvlPresets .chip").forEach(c => c.classList.toggle("on", c.dataset.r === r)); };
  $("#lvlPresets").addEventListener("click", e => { const c = e.target.closest(".chip"); if (!c) return; const [a, b] = c.dataset.r.split("-"); $("#lvlMin").value = a; $("#lvlMax").value = b; syncPreset(); });
  ["#lvlMin", "#lvlMax"].forEach(id => $(id).addEventListener("input", syncPreset)); syncPreset();
  $("#focusOther").addEventListener("change", e => $("#otherBox").classList.toggle("hidden", !e.target.checked));
  $("#otherChips").addEventListener("click", e => { const c = e.target.closest(".chip"); if (c) c.classList.toggle("on"); });
  $("#genForm").addEventListener("submit", e => { e.preventDefault(); runGenerate(); });
  $("#genOut").addEventListener("click", onGenClick);
})();
function readGenSettings() {
  let min = clamp(parseInt($("#lvlMin").value) || 1, 1, 20), max = clamp(parseInt($("#lvlMax").value) || min, 1, 20);
  if (max < min) [min, max] = [max, min];
  $("#lvlMin").value = min; $("#lvlMax").value = max;
  const seed = ($("#seed").value.trim() || newSeed()).toUpperCase();
  return {
    min, max, seed, format: $("input[name=format]:checked").value,
    focus: $$("input[name=focus]:checked").map(i => i.value),
    other: $$("#otherChips .chip.on").map(c => c.dataset.t),
    custom: $("#focusOther").checked ? $("#customTheme").value.trim().slice(0, 80) : "",
    party: clamp(parseInt($("#partySize").value) || 4, 1, 8), tone: $("#tone").value, setting: $("#setting").value, offsets: {}
  };
}
function runGenerate() {
  const s = readGenSettings();
  currentGen = generateAdventure(s);
  drawGen(); showResult("#genOut");
}
function drawGen() { $("#genOut").innerHTML = renderAdventure(currentGen, { rerolls: true, saveBtn: true }); }
function onGenClick(e) {
  const rb = e.target.closest("[data-reroll]");
  if (rb && currentGen) {
    const s = currentGen.settings; s.offsets[rb.dataset.reroll] = (s.offsets[rb.dataset.reroll] || 0) + 1;
    const y = window.scrollY; currentGen = generateAdventure(s); drawGen(); window.scrollTo(0, y); return;
  }
  const mb = e.target.closest("[data-mkmap]");
  if (mb && currentGen) { openMapForLocation(currentGen, +mb.dataset.mkmap); return; }
  if (e.target.id === "saveCampaign") saveGenAsCampaign(currentGen);
}
/* a location's map: first a preview window to check it (owner, 2026-11-25), then Open in Dungeon Map opens that same map */
const LOCMAP = { g: null, i: 0, seed: "" };
function locMapParams(g, i, seed) {
  const l = g.locations[i], s = g.settings;
  return { name: l.name, theme: l.mapTheme, size: "medium", rooms: 10, level: s.format === "oneshot" ? g.outline.level : s.min, party: s.party, seed, style: MAP_STYLES[$("#mapStyle").value] ? $("#mapStyle").value : "parchment" };
}
function openMapForLocation(g, i) { LOCMAP.g = g; LOCMAP.i = i; LOCMAP.seed = g.seed + "-" + (i + 1); locMapShow(); }
function locMapShow() {
  const { g, i, seed } = LOCMAP, l = g.locations[i], d = generateDungeon(locMapParams(g, i, seed)), box = $("#locMapModal");
  box.dataset.seed = seed;
  $("#locMapTitle").textContent = `Map for ${l.name}`;
  $("#locMapInfo").textContent = `${cap1(l.mapTheme)} · ${d.rooms.length} rooms · party level ${d.params.level} · seed ${seed}`;
  const cv = document.createElement("canvas"); drawDungeon(cv, d, true, { scale: 1 }); cv.setAttribute("aria-label", `Preview of the map for ${l.name}`);
  $("#locMapPic").replaceChildren(cv);
  $("#locMapRooms").innerHTML = d.rooms.map(o => `<li><b>${o.num}. ${esc(o.type || o.name || "Room")}</b>${o.enc ? ` <span class="muted">· ${esc(o.enc.text)}</span>` : ""}${o.boss ? ` <span class="tag">boss</span>` : ""}</li>`).join("");
  /* Save to campaign: this adventure's campaign first (if it was saved to the Tracker), else the last one picked */
  const sel = $("#locMapCamp"), camps = Store.list(), was = sel.value, mine = camps.find(c => c.gen && c.gen.seed === g.seed);
  sel.innerHTML = camps.length ? camps.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("") : `<option value="">No campaigns yet</option>`;
  sel.value = camps.some(c => c.id === was) ? was : mine ? mine.id : camps[0] ? camps[0].id : "";
  sel.disabled = !camps.length; $("#locMapSave").disabled = !camps.length;
  $("#locMapSave").title = camps.length ? "Keep this map in the campaign: it shows on the Dungeon Map's Your maps and the campaign's Maps tab" : "Save the adventure to the Campaign Tracker first (Save to Campaign Tracker), then save its maps to it";
  if (!box.classList.contains("open")) { box.classList.add("open"); $("#locMapOpen").focus(); }
}
$("#locMapSave").addEventListener("click", () => {
  const { g, i, seed } = LOCMAP, c = Store.get($("#locMapCamp").value); if (!g || !c) { toast("Save the adventure to the Campaign Tracker first."); return; }
  const rec = locMapParams(g, i, seed); c.maps = c.maps || [];
  if (c.maps.some(m => !m.kind && m.name === rec.name && m.seed === rec.seed)) { toast(`“${rec.name}” is already saved in “${c.name}”.`); return; }
  c.maps.unshift({ ...rec, id: uid("m"), saved: Date.now() }); Store.save(c);
  toast(`Map saved to “${c.name}”. It's on the Dungeon Map's Your maps and the campaign's Maps tab.`);
});
function locMapClose() { $("#locMapModal").classList.remove("open"); }
$("#locMapAgain").addEventListener("click", () => { LOCMAP.seed = newSeed(); locMapShow(); });
$("#locMapClose").addEventListener("click", locMapClose);
$("#locMapModal").addEventListener("click", e => { if (e.target.id === "locMapModal") locMapClose(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#locMapModal").classList.contains("open")) locMapClose(); });
$("#locMapOpen").addEventListener("click", () => {
  const { g, i, seed } = LOCMAP; if (!g) return; locMapClose();
  setMapForm(locMapParams(g, i, seed));
  mapShowBuild(); location.hash = "map"; renderMap(); /* opens in Build, not Your maps (03e-map-modes.js) */
});
