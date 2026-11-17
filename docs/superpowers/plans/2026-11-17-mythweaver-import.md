# MythWeaver Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a **Lore** tab in each Tracker campaign, plus an **⬆ Import campaign** button that reads MythWeaver account exports, as well as Forge campaign files. Campaigns, sessions, NPCs (with picture links), lore and characters come across. Importing again updates in place, and a full browser rolls back cleanly.

**Architecture:**
- **Lore:** stored on the campaign (`c.lore`) and drawn by `loreHTML(c)` as a new `subTab`. Safe markdown comes from `mdHTML`.
- **Reading:** `mwRead(json)` turns the export into a plan with no side effects, and `mwPlanCamp(plan, campIdx, existing)` maps one campaign onto a Tracker campaign, updating it if it already exists.
- **Committing:** `mwCommit` saves synchronously through `Store.lsWrite()`, so a quota failure can be undone.
- **Characters** reuse `importBuild`/`importCommit`, with a `base` option that skips the score solver.

**Tech Stack:** vanilla JS and CSS in `public/index.html`, and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-mythweaver-import-design.md`

## Global Constraints

- Never store, show or commit `account` data (email, name, username). The tests assert the email string isn't anywhere in `localStorage`.
- Lore types are `place`, `item`, `monster`, `encounter` and `other`. MythWeaver's location→place, item→item, monster→monster, encounter→encounter, generic (and anything else)→other.
- Rule set: `gameSystem` "dnd.5e.1" means 2014, "dnd.5e.2" means 2024, and anything else defaults to 2014. The window has a choice.
- Picture links must be https (`npcUrlOk`).
- Markdown is escaped first, then only these become HTML: `**bold**`, `*italic*`, `#`/`##`/`###` headings, `- `/`* ` and `1. ` lists, and paragraphs.
- Checks are `npm run test:lore` and `npm run test:mythweaver`. Add a `NEWS` entry and notes to README and CLAUDE.md. Push once at the end.

## Review Focus

- **A lore entry with a missing name or sections** → it imports as "Untitled", with no crash. The fixture has one.
- **Importing a Forge campaign JSON through the renamed button** → it behaves exactly as before. The `test:mythweaver` UI part checks it.
- **A MythWeaver campaign with no lore and no sessions** → it imports as an empty campaign. The fixture's second campaign covers it.
- **A NPC in MythWeaver deleted and then the file re-imported** → the Forge copy is kept, not deleted. Re-import never deletes; the check covers it.
- **Search in Lore with regex-like text** such as `(` or `[` → no error. The `test:lore` search uses "(".

---

### Task 1: The Lore tab

**Files:**
- Modify `public/index.html`:
  - `blankCampaign` (add `lore: []`)
  - the campaign-load lists in the import handler and `renderTracker` (ensure `c.lore`)
  - the `tabs` list (add `["lore", "Lore", c.lore.length]` after NPCs)
  - `renderSub` (call `loreHTML(c)`)
  - the click, input and change handlers on `campMain`
  - CSS
- Create `test/e2e/lore.cjs`, and add `"test:lore"` to `package.json`.

**Interfaces:**
- Produces:
  - `mdHTML(text) -> string` (safe HTML).
  - `LORE_TYPES = {place: "Places", item: "Items", monster: "Monsters", encounter: "Encounters", other: "Other"}`.
  - `loreHTML(c)`.
  - The UI state `LORE = {q: "", type: "", open: Set, edit: id|null}`.
  - `loreNew(c) -> entry`.
  - Entries: `{id, mwId?, name, type, tags[], imgUrl?, desc, sections:[{t, x, dm}], src?}`.
  - Buttons use `data-lore="add|open|edit|save|cancel|del|tv|secadd|secdel"` with `data-id`/`data-i`. Fields use `data-lf="name|type|tags|imgUrl|desc"` and `data-ls="t|x|dm"` with `data-i`. Search is `#loreQ`; chips use `data-lt`.

- [ ] **Step 1: Write the failing check `test/e2e/lore.cjs`** (offline). Seed a campaign with three entries: a place with two sections (one `dm:true`) containing `**bold**` and a `- list`, an item with an https `imgUrl`, and an "other" entry. Checks:
  1. The Tracker shows a "Lore 3" sub-tab.
  2. The chips show counts: Places 1, Items 1, Other 1.
  3. Clicking Items shows only the item.
  4. Searching "bold" (it's in the section text) shows the place; searching "(" shows nothing and makes no error.
  5. Opening the place shows `<strong>bold</strong>`, a `<li>`, and a "DM only" mark on the DM section. A `<script>` in the description shows as text.
  6. **+ Add entry** → edit form; fill the name "Ruined Tower", the type place, the tags "ruin, north", and one section → Save → it's listed, with `tags` `["ruin","north"]`.
  7. Editing the name → it's saved.
  8. A non-https picture link is refused with a toast.
  9. **📺 TV** on the item with a picture opens the TV pop-up (handout).
  10. Delete asks, then removes it.
  11. Reload → the entries are still there (wait 900 ms for the save first).
  12. At 390 × 640 touch → no sideways scrolling on the Lore tab.
- [ ] **Step 2:** Run `npm run test:lore`. Expected: FAIL at check 1.
- [ ] **Step 3: Implement.** Reuse `npcPicTV`'s approach for TV (fetch with CORS, or a toast). The card picture is an `<img>` with `object-fit:contain`, 64 px.
- [ ] **Step 4:** Run `npm run test:lore`, then `npm run test:layout` and `npm run test:npcpic`. Expected: all pass.
- [ ] **Step 5:** Commit: "Lore tab in the Campaign Tracker".

### Task 2: Reading a MythWeaver export

**Files:**
- Modify `public/index.html`: a new section "MythWeaver import" (`mwRead`, `mwText`, `mwPlanCamp`, `mwChar`), and `importBuild` (honour `D.base`).
- Create `test/e2e/fixtures/mythweaver-sample.json` (made up) and `test/e2e/mythweaver.cjs`, and add `"test:mythweaver"` to `package.json`.

**Interfaces:**
- Consumes: `LORE_TYPES`, entry shape (Task 1), `importBuild`.
- Produces:
  - `mwRead(json) -> {campaigns:[{mwId, name, desc, lore[], sessions[], other: bool}], other: lore[], characters:[{mwId, name, campaignIds, sheet, gameSystem}], images: n} | {error}`.
  - `mwText(s) -> string`: HTML to markdown-ish text. `<p>`→paragraph, `<h1-3>`→`#`, `<li>`→`- `, `<strong>/<b>`→`**`, `<em>/<i>`→`*`, other tags stripped, entities decoded.
  - `mwPlanCamp(read, i, existing?) -> {camp, stats:{npcs, lore, sessions, updated}}`. It doesn't save.
  - `mwChar(ch, ed) -> Draft`, with `D.base = sheet.abilityScores` and `D.final` unset.
  - `importBuild` uses `opts.base` directly when `D.base` is set.

- [ ] **Step 1: Write the fixture and failing checks.**
  - **The fixture:**
    - `account: {email: "nobody@example.invalid", name: "Fake Person"}`
    - Campaign "Ashen Vale":
      - 2 NPCs: one with a "Role" section, one with an HTML section and a `dmOnly` section
      - 1 location, 1 item, 1 monster, 1 encounter, 1 generic, and 1 lore entry with no name or sections
      - 2 sessions: one with a `detailedRecap`, one with only a `summary`
    - Campaign "Empty Road" with no lore or sessions.
    - `otherLore`: 1 item.
    - A character "Brin Ashford": Fighter, Human, Soldier, level 1, standard array `{str:15, dex:13, con:14, int:8, wis:12, cha:10}`, class_skills `["skill-athletics", "skill-perception"]`, `gameSystem` "dnd.5e.1", in Ashen Vale.
    - `images`: 3.
  - **Checks:**
    - `mwRead` gives 2 campaigns, 1 character and images 3. No result field contains "nobody@example.invalid".
    - `mwPlanCamp` for Ashen Vale gives:
      - NPCs: 2. The first has role "Blacksmith" from its Role section; the second's notes contain "(DM only)" and no `<p>`.
      - lore: 6, with types place/item/monster/encounter/other plus the account item (tag "Account"). The nameless entry is "Untitled".
      - sessions: 2, the first summary from `detailedRecap`, with nums and dates.
      - `c.mwId` is set; each entry's `mwId` is set; an NPC with `imageUrl` has `imgUrl`.
    - `mwText("<p>Hi <strong>there</strong></p><ul><li>a</li></ul>")` === `"Hi **there**\n\n- a"`.
    - `mwChar` + `importBuild` gives a Fighter 1, Human (2014), with STR = 15 + the species bonus (Human +1 → 16), skills including Athletics and Perception, and bg Soldier.
    - Re-plan with existing: after adding a Forge NPC "Local Guard" to the planned campaign and changing an imported NPC's name in the fixture, `mwPlanCamp(read, 0, existing)` keeps "Local Guard", renames the matching NPC, adds no duplicates, and sets `stats.updated: true`.
    - A file without `format` → `{error}` matching /isn't a MythWeaver export/.
- [ ] **Step 2:** Run `npm run test:mythweaver`. Expected: FAIL (`mwRead` is not defined).
- [ ] **Step 3: Implement.**
  - **NPC role:** the first line of a section titled /role|occupation/i (up to 60 characters), else the description's first clause (up to 60).
  - **NPC notes:** description, then "Title: text" for each section, with " (DM only)" after DM titles, then "Tags: …".
  - **Session summary:** `detailedRecap || summary || shortRecap`, through `mwText`.
  - **Date:** `playedOn.slice(0, 10)`.
  - **Character:** `sheet.selectionsBySlot` class/species/background are ids like "monk"/"dragonborn"/"acolyte", matched with `impTitle` and the existing name matching. Class skills like "skill-acrobatics" → "Acrobatics". The level comes from `sheet.level`.
- [ ] **Step 4:** Run `npm run test:mythweaver` and `npm run test:import`. Expected: pass.
- [ ] **Step 5:** Commit: "Read MythWeaver exports".

### Task 3: The Import campaign window

**Files:**
- Modify `public/index.html`:
  - the Tracker side button (rename it **⬆ Import campaign**, keeping `#importFile`)
  - the `#importFile` handler (dispatch on content)
  - a new `#impCampModal` (sharing the pop-up CSS from the layout work)
  - `mwCommit`
  - `test/e2e/mythweaver.cjs` (UI checks)

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces:
  - `mwCommit(read, choices:{camps:[i], chars:[i], ed}) -> Promise<{ok, error?}>`.
  - Elements: `#impCampModal`, `#impCampOut`, `#impCampGo`, `#impCampCancel`, checkboxes `[data-mwcamp=i]` and `[data-mwchar=i]`, and the radio `impCampEd`.

- [ ] **Step 1: Write the failing UI checks.**
  1. The Tracker button reads "Import campaign".
  2. A Forge campaign JSON imports as before, with the toast "Campaign imported".
  3. The fixture opens `#impCampModal`, listing both campaigns, ticked, with counts ("2 NPCs · 6 lore · 2 sessions") and the character, ticked. It shows the size and "3 MythWeaver pictures aren't imported".
  4. Import → two Tracker campaigns, the Lore tab populated, Brin on My Characters, and the email not in `localStorage`.
  5. Re-import → the window says "Updates Ashen Vale". After import there are still two campaigns, and the character isn't duplicated.
  6. A simulated full browser (`localStorage.setItem` wrapped to throw for the campaign key) → the window shows "There isn't room", the campaigns list is unchanged, and nothing is half-saved.
  7. At 390 × 640 touch, the Import button is on screen.
- [ ] **Step 2:** Run `npm run test:mythweaver`. Expected: the UI checks FAIL.
- [ ] **Step 3: Implement.**
  - `mwCommit` keeps copies of the affected campaigns, writes them all with `Store.cache.set`, then `Store.lsWrite()`. If that returns false, it restores the copies and calls `lsWrite()` again.
  - In db mode (`Store.mode === "db"`) it calls `Store.save` for each.
  - Then the characters go through `importBuild` → `importCommit`.
  - **The size line:** `JSON.stringify(planned camps).length`, against roughly `5 MB − current localStorage size`.
- [ ] **Step 4:** Run `npm run test:mythweaver`, `test:backup`, `test:layout`, `test:lore` and `test:import`. Expected: all pass. Then try the owner's real export from the uploads folder (not committed) and record its counts.
- [ ] **Step 5:** Commit: "Import campaign window for MythWeaver exports".

### Task 4: Notes and the preview

- [ ] **Step 1:**
  - **`NEWS`:** id `2026-11-17-mythweaver`, title "Import your MythWeaver campaign, and a Lore tab", `go: "tracker"`, with items in plain words.
  - **README:** a section.
  - **CLAUDE.md:** a section, plus the commands `test:lore` and `test:mythweaver`.
- [ ] **Step 2:** Run all checks: `npm test`, plus `test:` layout, lore, mythweaver, import, hbpend, hbspell, npcpic, sheet, backup, tv, map, recap and calendar. Expected: all pass.
- [ ] **Step 3:** Commit, then push once. The PR #9 preview rebuilds.
