# Character Import (5e Companion App + PDF) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** one **⬆ Import character** button on My Characters reads a 5e Companion App file or a fillable PDF character sheet and rebuilds it as a Forge character. Unknown subclasses, species, backgrounds, feats and spells become homebrew automatically; a signed-in player's new homebrew waits for the DM.

**Architecture:**
- **Readers:** each source has a reader that turns the file into one shape, a **Draft** (`{opts, extras, homebrew, report}`). `compImport` reads Companion App JSON; `pdfImport` reads PDF form fields through vendored pdf.js.
- **Shared steps:** `importBuild` turns a Draft into a character by calling `generateCharacter` (with a score solver so the final scores equal the file's). `importCommit` saves the homebrew, either to the campaign or as pending on the character, and adds the character to the roster.
- **New homebrew kind:** `spell`.
- **Pending homebrew:** lives on characters (`c.hbPending`), is applied through `HB.pend`, and is kept out of every picker.

**Tech Stack:** vanilla JS in `public/index.html`, `src/portal.js` (esbuild), the Netlify API in `netlify/lib/api.mjs`, node:test, Playwright, and pdf.js (`pdfjs-dist`, Apache-2.0) vendored in `public/vendor/pdfjs/`.

**Spec:** `docs/superpowers/specs/2026-11-16-companion-import-design.md`

## Global Constraints

- **Rule set:** imports default to the **2014** rules, with a 2014/2024 choice in the dialog.
- **Scores:** the final scores must **equal the file's scores**. The file's `score` is final, after the species bonus. Base scores may go below 3.
- **Classes:** an unknown main class or multiclass refuses the whole import with "The Forge doesn't support the <Class> class yet." Nothing is saved.
- **Who saves homebrew:**
  - Signed in as a player → new homebrew goes to `c.hbPending` on that character, never to the campaign.
  - Offline, or signed in as the DM → `hbPut` straight away.
- **Pending homebrew stays out of** the builder, the quick forge, the Feats tab, Spells browsing, the level-up subclass list and the Homebrew list.
- **Never auto-made:** a homebrew entry whose name matches a built-in. The built-in is used instead. An existing homebrew entry with the same kind and name (and class, for subclasses) is reused, never duplicated.
- **Text limits:**
  - Homebrew feature and trait text goes up from 800 to **4000** characters, and descriptions from 1500 to **4000**. Imported text is cut to those limits.
  - The API's per-entry limit (`MAX_HOMEBREW_BYTES`, 50 000) stays.
- **New stored fields:** `c.importedFrom = {app, at}` and `c.hbPending = [entries]`. Each entry may carry `rejected: true`. Neither field goes in the `pcLevelTo` copy list.
- **Never commit players' own files:**
  - The Zook companion file can be a fixture: it holds a character only, with no personal details.
  - The PDF fixture is synthetic.
  - The MythWeaver export holds the owner's email and is never committed.
- **Tests:** every new check runs through an `npm run` script, so it works on Windows. Add a `NEWS` entry at the top of the list.

## Review Focus

- **The DM opens a player's imported character before approving** → the sheet works, and its subclass features show their text (pending applied for everyone loading that roster).
- **The same player imports twice** → the second import reuses the first character's pending entries by name instead of making duplicates. The DM queue shows each entry once, listing both characters.
- **The DM approves an entry that a second character also has pending** → both characters' `hbPending` lose it (matched by kind + name).
- **A very long Companion App feature text** (Ranger's Companion is about 1 600 characters) → kept whole, up to 4 000.
- **A Companion App file with `jobs` of two classes** → the second becomes `multi`, and its subclass is resolved or made into homebrew the same way.

---

### Task 1: Homebrew spells

**Files:**
- Modify: `netlify/lib/api.mjs` (`HOMEBREW_KINDS`)
- Modify: `test/api.test.mjs`
- Modify: `public/index.html`:
  - `HB_KINDS`
  - `hbNew`, `hbDraftOf`, `hbItemOf` and `hbFormHTML` (a spell body)
  - `hbApply`
  - `spLoad`
  - the Spells list row (a "Homebrew" tag)
  - `hbBuiltIn`
  - the text limits
- Create: `test/e2e/homebrew-spells.cjs`
- Modify: `package.json` (`test:hbspell`)

**Interfaces:**
- Produces:
  - Homebrew entries `{kind:"spell", id, name, ed, desc, l, s, c:[classes], t, r, cp, m, du, co, ri, h}`.
  - `hbSpellsApply()` puts them into `SP.data[ed]` as `{n:name, d:desc, …, hb:true, pend?:true}`, with ids `ed-<index>`, appended after the built-ins. It's called from `hbApply` and at the end of `spLoad`.
  - `hbBuiltIn("spell", name)` checks spell names in both editions.

- [ ] **Step 1: Write the failing tests.**
  - **API** (`test/api.test.mjs`, a subtest in "full campaign flow"): a player PUT of `{kind:"spell", name:"Cheers"}` → 403; the DM's → 200; GET lists it.
  - **Browser** (`test/e2e/homebrew-spells.cjs`, offline, own static server like `test/e2e/tv.cjs`). It checks:
    1. The Homebrew tab shows a "Spells" group with + New.
    2. Making "Cheers" (level 0, Enchantment, classes Wizard, desc "Drinks for all") saves it, and the entry has `kind:"spell"`, `l:0`, `c:["Wizard"]`.
    3. The Spells tab, searching "Cheers", shows one row with a "Homebrew" tag.
    4. `spellOf("2014","Cheers").d === "Drinks for all"`.
    5. Naming a homebrew spell "Fireball" is refused (/already a built-in/).
    6. Deleting it removes it from the Spells tab.
    7. A 3000-character feature text in a homebrew subclass survives save (`features[0].d.length === 3000`).
- [ ] **Step 2:** Run `npm test` and `npm run test:hbspell`. Expected: the API subtest FAILS (400 "Unknown kind of homebrew"); the browser check FAILS at check 1.
- [ ] **Step 3: Implement.**
  - Add `"spell"` to `HOMEBREW_KINDS`. Add `spell: "Spells"` to `HB_KINDS`.
  - **The spell form:**
    - level (0–9, with 0 shown as "Cantrip")
    - school (the 8 schools)
    - classes (checkboxes for the 12 classes)
    - casting time, range, components (V/S/M checkboxes plus a material text box), duration
    - concentration and ritual checkboxes
    - "At higher levels"
    - The description box is the spell text.
  - Spells get no `fx` (no sheet effects).
  - Raise the limits in `hbItemOf` and the `maxlength`s in `hbFormHTML` to 4000.
- [ ] **Step 4:** Run `npm test` and `npm run test:hbspell`. Expected: all pass (API 12/12).
- [ ] **Step 5:** Commit: "Homebrew spells".

### Task 2: Pending homebrew and the DM's approval queue

**Files:**
- Modify: `public/index.html`:
  - `HB` (add `pend: []`)
  - `hbOf` stays HB.list-only; add `hbAny(kind)`
  - `hbApply` (register pending species, backgrounds, subclass and spell text with `pend:true`)
  - the lookups at `hbEffects`, `subDesc` (~4695), `generateCharacter` (`hbSub`), the species-trait lookup (~5180) → `hbAny`
  - `bgList` and `raceList` (filter out `pend`)
  - the spell pickers (~5789 browse, ~6000 character list, ~9507 Magic Initiate) → filter out `s.pend`
  - `renderRoster` calls `hbPendSync()`
  - `renderHomebrew` (the "Waiting for approval" box)
  - the sheet notice for rejected entries
- Modify: `src/portal.js` (`partyCard`: the "N homebrew to approve" tag)
- Create: `test/e2e/hb-pending.cjs`
- Modify: `package.json` (`test:hbpend`)

**Interfaces:**
- Consumes: Task 1's spell entries.
- Produces:
  - `HB.pend` holds the entries from `PCS.roster[*].hbPending` that aren't rejected and aren't in `HB.list` (by kind + name + cls). Each carries `from: [{id, name}]`.
  - `hbPendSync()` recomputes `HB.pend` and calls `hbApply`.
  - `hbAny(kind)` = `[...hbOf(kind), ...HB.pend.filter(x => x.kind === kind)]`.
  - `hbApprove(key)` and `hbReject(key)`, where key = `kind|cls|name` lowercase.
  - `pendKey(x)` builds that key.

- [ ] **Step 1: Write the failing check `test/e2e/hb-pending.cjs`** (offline). Seed the roster (`dmforge.pcs.v1`) with one Ranger 7 character, "Zook", with `subclass:"Swarmkeeper [UA]"` and these pending entries:
  - `{kind:"subclass", cls:"Ranger", name:"Swarmkeeper [UA]", features:[{l:3, n:"Gathered Swarm", d:"A swarm…"}]}`
  - `{kind:"species", name:"Mark of Sentinel Human", asi:{str:1, wis:1}, speed:30, traits:[{l:1, n:"Sentinel's Intuition", d:"…"}]}`
  - `{kind:"spell", name:"Cheers", l:0, …}`

  Checks:
  1. The My Characters sheet for Zook lists "Gathered Swarm", and the race shows "Mark of Sentinel Human".
  2. The quick forge species select has no "Mark of Sentinel Human".
  3. `subclassList("2014","Ranger")` has no "Swarmkeeper [UA]".
  4. Spells-tab search "Cheers" → no rows.
  5. The Homebrew tab shows "Waiting for approval" with 3 entries, each naming "Zook".
  6. Approve the subclass → it's in `HB.list`; Zook's `hbPending` no longer has it; `subclassList` now has it.
  7. Reject the spell → Zook's entry has `rejected:true`; the queue shows 1 entry; the Spells tab still has no "Cheers"; Zook's `prepared` no longer has it.
  8. A second seeded character with the same pending species → the queue shows that species once, naming both characters.
- [ ] **Step 2:** Run `npm run test:hbpend`. Expected: FAIL at check 1.
- [ ] **Step 3: Implement.**
  - **Reject:**
    - subclass → clear `c.subclass` (if it matches) and `pcRebuild`
    - feat → remove from `bonusFeats` and `pcRebuild`
    - spell → remove from `prepared`
    - species or background → the entry stays applied to that character (marked `rejected`), and its sheet shows the notice "Your DM didn't approve <name>. Talk to them about another <species|background>."
  - **Approve:** `hbPut(entry without from/rejected)`, then remove it from every roster character's `hbPending`, then `pcPersist`.
  - **Approval needs homebrew rights.** Approve and Reject are only on the Homebrew tab, which players already can't use when signed in. Offline, the queue shows for the browser's own roster.
- [ ] **Step 4:** Run `npm run test:hbpend`, `npm run test:sheet` and `npm run test:hbspell`. Expected: all pass.
- [ ] **Step 5:** Commit: "Pending homebrew waits for the DM".

### Task 3: Companion App reader and the build

**Files:**
- Modify: `public/index.html`: a new section "Character import". Reuse `eqGear` for gear and `spellOf` for spells.
- Create: `test/e2e/fixtures/companion-zook.json` (the owner's sample, unchanged)
- Create: `test/e2e/char-import.cjs`
- Modify: `package.json` (`test:import`)

**Interfaces:**
- Consumes: `hbAny` and `pendKey` (Task 2); spell homebrew entries (Task 1).
- Produces:
  - `compImport(json, ed) -> Draft | {error}`.
  - The Draft:
    - `opts`: the generator options. `cls`, `level`, `subclass`, `race`, `sub`, `bg`, `multi`, `keepSkills`, `keepExpert`, `bonusFeats`, `gender`, `name`, `ed`, a seed from the file `id`, `subclass:"none"` when there's none, and `sub:"none"` when unknown.
    - `extras`: `{inv, coins, prepared, align, xp, hpCur, trait, ideal, bond, flaw, notes, conds, death}`.
    - `homebrew`: entries to create, each with a fresh `id`.
    - `final`: `{str..cha}`, the scores the file says.
    - `report`: `{matched:[], made:[], differ:[], dropped:[]}`, all plain sentences.
  - `importBuild(draft) -> {c, report}`:
    1. Applies `draft.homebrew` temporarily (pending) so the generator can see it.
    2. Solves the base scores: start with `base = final`, generate, then `base += final − got`, for up to 4 rounds until they match.
    3. Applies `extras`, then `pcEnsure`, `kitMoved:true`, `kit:[]`, and `importedFrom`.
    4. Compares and fills `report.differ`.
    5. Doesn't save.
  - `spellMatch(ed, name) -> {s, fuzzy:boolean} | null`. It's exact here; Task 5 makes it lenient.

- [ ] **Step 1: Write the failing check `test/e2e/char-import.cjs`** (offline; it reads the fixture and runs `compImport` and `importBuild` in the page). Checks for Zook:
  1. The name is "Zook Hornraven", cls Ranger, level 7, ed 2014, bg "Folk Hero" (a built-in match).
  2. Final scores are exactly STR 5, DEX 12, CON 13, INT 14, WIS 15, CHA 9.
  3. Proficient skills include Animal Handling, Athletics, Insight and Survival.
  4. The homebrew to make has the subclass "Swarmkeeper [UA]" (cls Ranger, features at levels 3/7/11/15, with the first feature's text starting "You gain a swarm" or the file's exact first words) and the species "Mark of Sentinel Human" (asi `{str:1, wis:1}`, speed 30, traits named from the file).
  5. Every Zook spell that has a built-in match (Shield, Mage Hand, Blade Ward, Faerie Fire, Web) becomes `prepared` entries with no homebrew.
  6. The inventory has Scale Mail ×1 (linked by `ref`), Shortsword ×2 and Arrows ×20. "Set of artisan's tools Of Your Choice" is kept by name.
  7. Coins are gp 10; xp is 23000; the align is "Lawful Evil"; the bond text is kept.
  8. Favored Enemy and Favored Terrain picks appear in `report.dropped` and in the notes.
  9. The built character has "Gathered Swarm" in its features, and `pcLevelTo(c, 8)` keeps STR 5 (allowing for an ASI going to DEX/WIS at 8).
  10. A file with `jobs:[{jobId:"blood_hunter", level:3}]` → `{error}` matching /doesn't support the Blood Hunter class/.
  11. `{"foo":1}` → `{error}` matching /isn't a 5e Companion App character/.
- [ ] **Step 2:** Run `npm run test:import`. Expected: FAIL (`compImport` is not defined).
- [ ] **Step 3: Implement.**
  - **Mapping tables:**
    - The app's alignment enum → "Lawful Evil" and so on.
    - The skill enum → Forge skill names (`SLEIGHT_OF_HAND` → "Sleight of Hand").
    - Built-in matching compares names case-insensitively, dropping a trailing `[PHB]`/`[SRD]`-style tag but keeping `[UA]`. Ids like `folk_hero` → "Folk Hero".
  - **Gear:**
    - A leading count ("20 Arrows") becomes the quantity.
    - `eqGear(ed, name)` finds the item. Retry with the name split into words ("Scalemail" → "Scale mail", by checking whether removing one space-free join matches any gear name). Otherwise keep the name.
    - Carry `isEquipped` → `eq` and `isAttuned` → `attuned`.
- [ ] **Step 4:** Run `npm run test:import` and `npm run test:sheet`. Expected: all pass.
- [ ] **Step 5:** Commit: "Read 5e Companion App characters".

### Task 4: The Import character dialog

**Files:**
- Modify: `public/index.html`:
  - the My Characters toolbar (an **⬆ Import character** button, `#impCharBtn`)
  - a new `#impCharModal` (modelled on `#backupModal`)
  - `importCommit`
  - `NEWS`
- Modify: `test/e2e/char-import.cjs` (add UI checks), `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: `compImport`, `importBuild` (Task 3), `hbPut`, `HB.pend`/`hbPendSync` (Task 2).
- Produces:
  - `importCommit(draft, c) -> Promise<boolean>`. Players signed in (`window.Portal && Portal.cloud && !Portal.isDM()`) → `c.hbPending = draft.homebrew`. Otherwise → `hbPut` each, and stop with a toast if any fails.
  - Then: add to `PCS.roster`, set `RC.id`, `pcPersist`, `hbPendSync`, and open the sheet.
  - `impCharRead(file) -> Promise<Draft|{error}>` picks the reader by content: `%PDF` → `pdfImport` (Task 5; until then, "PDF import is coming soon"), otherwise JSON → `compImport`.

- [ ] **Step 1: Write the failing UI checks** (added to `char-import.cjs`):
  1. My Characters has `#impCharBtn`; clicking it opens `#impCharModal` with a file input, a 2014/2024 choice (2014 checked) and the export tip text.
  2. Choosing the Zook fixture shows the summary: headings "Matched", "New homebrew" (listing "Swarmkeeper [UA]" and "Mark of Sentinel Human"), and "Not brought across".
  3. Import → the modal closes; the roster has Zook; the Homebrew list (offline) has both entries; the sheet shows Ranger 7.
  4. Importing Zook again → no duplicate homebrew (still one "Swarmkeeper [UA]").
  5. A text file → the modal shows "isn't a 5e Companion App character", and Import is disabled.
  6. Cancel → nothing is added.
  7. **Player path:** with `window.Portal = {cloud:true, isDM:() => false, changed(){}, hbPut: () => {throw new Error("no")}}` stubbed in the page, importing Zook saves the character with `hbPending.length === 2`, and `HB.list` doesn't change.
- [ ] **Step 2:** Run `npm run test:import`. Expected: FAIL at UI check 1.
- [ ] **Step 3: Implement** the dialog.
  - The summary also says "(your DM will be asked to approve)" on the player path.
  - Add `NEWS` entry `2026-11-16-charimport`, title "Import characters from the 5e Companion App", `go:"roster"`, with items in plain words.
  - README: a section. CLAUDE.md: a section listing the functions and fields above, plus `test:import`, `test:hbspell` and `test:hbpend` in Commands.
- [ ] **Step 4:** Run `npm run test:import`, `npm run test:hbpend`, `npm run test:backup` and `npm test`. Expected: all pass.
- [ ] **Step 5:** Commit: "Import character dialog".

### Task 5: PDF character sheets

**Files:**
- Create: `public/vendor/pdfjs/pdf.min.mjs`, `public/vendor/pdfjs/pdf.worker.min.mjs`, and `public/vendor/pdfjs/LICENSE` (from `pdfjs-dist`, version pinned in the file header comment)
- Create: `tools/make-test-sheet.py` (writes the synthetic fillable PDF with pypdf) and `test/e2e/fixtures/sheet-wizard.pdf`
- Modify: `public/index.html` (`pdfImport`, `pdfFields`, the lenient `spellMatch`, subrace inference), `test/e2e/char-import.cjs`, `test/e2e/server.mjs` (the `.mjs` and `.pdf` content types), `public/sw.js` (bump `CACHE`; vendor files are cached like scripts)

**Interfaces:**
- Consumes: the Draft shape, `importBuild`, `importCommit` (Tasks 3–4).
- Produces:
  - `pdfFields(arrayBuffer) -> Promise<{fields:{name: value}, pos:{name:{page, x, y}}}>`. It uses `import("./vendor/pdfjs/pdf.min.mjs")`, `getFieldObjects()`, and the widget `rect` and page.
  - `pdfImport({fields, pos}, ed) -> Draft | {error}`.

- [ ] **Step 1: Make the fixture and write the failing checks.**
  - `tools/make-test-sheet.py` writes a 3-page PDF with AcroForm text fields and check boxes using the official names, filled like this: "Wizard 6", "Halfling", "Charlatan", "CG", STR 8, DEX 20, CON 16, INT 18, WIS 13, CHA 15, `HPMax` 44, `AC` 15, `Check Box 20`/`21`/`25`/`27`/`31`/`38` = /Yes, `Features and Traits` containing "Naturally Stealthy", and these spell lines:
    - `Spells 1014` "Firebolt", `1015` "Detect Magic", `1023` "Magic Missle", `1024` "Protection from Evil"
    - `1034` "Mirror Image", `1036` "Bone Shard (Bonus)", `1046` "Haste", `1047` "Melf's Minute Meteors"
    - Their page-3 positions sit under `SlotsTotal 19`/`20`/`21` headers at the right heights.
  - Commit both the script and the generated PDF. The checks:
    1. Wizard 6, Halfling **Lightfoot**, Charlatan, "Chaotic Good", DEX 20, INT 18.
    2. Saves INT and WIS; skills include Arcana, Deception, Investigation and Sleight of Hand.
    3. `prepared` has Fire Bolt, Detect Magic, Magic Missile, Protection from Evil and Good, Mirror Image, Haste and Melf's Minute Meteors. The report lists "Firebolt → Fire Bolt" and "Magic Missle → Magic Missile".
    4. "Bone Shard" becomes a name-only homebrew spell at level 2.
    5. The report has "Choose a Wizard subclass" and "Portrait not imported".
    6. `report.differ` is empty for HP (44) and AC (15). If it isn't, the check prints the differences.
    7. A PDF without fields (generate a blank one-page PDF in the test with pypdf? No: build it in the page with a minimal `%PDF` byte string) → the error matches /no fillable fields/.
    8. **UI:** choosing the PDF in `#impCharModal` shows the summary, and Import adds the wizard.
- [ ] **Step 2:** Run `npm run test:import`. Expected: the PDF checks FAIL.
- [ ] **Step 3: Implement.**
  - **Spell line levels:** the nearest `SlotsTotal 19..27` header above each line in the same column, by `pos`. Fall back to the numbering in the spec.
  - **Lenient spell matching:**
    - Drop text in brackets. Compare letters only, in lower case.
    - Match exactly, then by a name that starts a built-in name, then within an edit distance of 2 (names of at least 6 letters).
    - When there's more than one candidate, take the shortest name.
  - **Subrace:** the subrace whose trait name appears in `Features and Traits` / `Feat+Traits`.
  - **Expertise** is inferred when skill value = mod + 2 × proficiency.
  - **Text boxes:**
    - `Equipment` and `Treasure` lines → inventory.
    - `ProficienciesLang` lines → `toolsChosen`/`langs`, split on known language names.
    - `Allies`, `Age`, `Height`, `Weight`, `Feat+Traits` and `Features and Traits` → notes.
- [ ] **Step 4:** Run `npm run test:import`, then try the owner's Jasper PDF by hand from the uploads folder (not committed), then `npm run test:sheet` and `npm test`. Expected: all pass. For Jasper, record the summary in the ledger.
- [ ] **Step 5:** Commit: "Import fillable PDF character sheets".
