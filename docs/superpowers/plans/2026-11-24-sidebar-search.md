# Side menu with search: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the tabs into a searchable, foldable side menu on the left, with sections under some tabs and one search that finds the person's own things, the rules and the tabs.

**Architecture:** The existing `<nav>` and its `a[data-view]` links move out of the header into a new `<aside id="fside">`. Portal still shows and hides those links, and `route()` still marks the active one. The search box, the groups, the sections, folding and the phone panel all live in a new `src/app/21-sidebar.js`. For rules results, `compendiumSearch` is split so the side menu can get its matches without drawing the Compendium page.

**Tech Stack:** Vanilla JS (global functions, joined by `tools/build.mjs`), CSS in `src/app.css`, Playwright checks in `test/e2e/`.

**Spec:** `docs/superpowers/specs/2026-11-24-sidebar-search-design.md`

## Global Constraints

- Edit `src/`, never `public/`. No `onclick=` attributes; use `addEventListener` (the page guard strips handlers).
- Use `esc()` on every value put into HTML: search results show characters' and campaigns' own text.
- No wood look; use the current stone-and-gold variables (`--gold`, `--gold2`, `--slab`, `--well`, `--line`, `--ink`).
- Don't use the class name `.side`, which is already the sticky side panel inside tabs. The new menu uses `fside`.
- The folding choice goes in `dmforge.side.v1` ("1" = folded). It's a UI preference, so it isn't in `BACKUP_KEYS`.
- Search starts at 2 letters, after a 150 ms pause, with at most 5 rows per group. Menu width is 240 px open and 56 px folded. Phones are `max-width:600px` (`hdrPhone`).
- Players never get Tracker, World, NPC or homebrew results: each source is gated by `Portal.views` (when it's set) including that tab.

## Review Focus

1. **Every tab and section opens with no page error**, as the offline user, the signed-in DM and the signed-in player (the owner's request). Covered by the walk-every-page loop in Task 4.
2. **Text with `<b>` or `<img onerror>` in a character or Lore name** shows as text in results. Covered by a check in Task 3.
3. **A search typed before the rules data has loaded** shows rules results when it arrives, not a stale or empty list. Covered by the request counter in Task 3 (the last search wins).
4. **Signing in as a player hides DM tabs in the menu and in search** (Portal `hidden` links). Covered by Task 4's player pass.
5. **Phones:** More opens the menu as a panel, Escape or a tap outside closes it, and picking a tab closes it. Covered by Task 4.

---

### Task 1: The side menu replaces the header tabs

**Files:**
- Modify: `src/index.html` (move `<nav>` into a new `<aside id="fside">` right after `</header>`; delete `#hdrTabSel`, `#mobileMenu`)
- Modify: `src/app.css` (rules in a new block "Side menu (2026-11-24)"; drop the `.hdr-mini`/`.hdr-tabsel` rules; header `nav a` rules become `#fside nav a`)
- Modify: `src/app/14-boot.js` (`hdrSync`: no tab picker, and no `hdr-mini` on laptops; `hdrToggle` is shown on phones only; `mobileMore` opens the menu panel)
- Create: `src/app/21-sidebar.js`
- Test: `test/e2e/sidebar.cjs`, plus `"test:sidebar"` in `package.json`

**Interfaces:**
- Produces:
  - `SIDE_GROUPS`: `[[label, [view, ...]], ...]`, in the order Prep / Characters / Rules / Players / Forge from the spec.
  - `SIDE_SECTIONS`: `{ tracker: [[key,label],...] (the 14 sub-tabs, same keys as the Tracker's tabs), monsters: [["forge","Forge a creature"],["build","Build a monster"],["srd","Monster Manual"]], items: [["all","All"],["gear","Standard"],["magic","Magic"],["custom","Mine"]], world: [["place","Places"],["build","World builder"]] }`.
  - `sideGo(view: string, section?: string): void` opens a tab, and a section if given:
    - tracker: sets `subTab`;
    - monsters: checks the `monMode` radio and fires `change`;
    - items: checks the `itMode` radio and fires `change`;
    - world: sets `W.mode`, calls `wbStart("settlement")` when `build` and `!W.build`, then `renderWorld()`.

    Then it sets `location.hash` (or calls `route()` when the hash is already that tab).
  - `sideFold(folded: boolean): void`, `sideOpen(): void` and `sideClose(): void` (the phone panel).
  - `sideSync(view: string): void`, called at the end of `route()`. It marks the active tab and section, and hides the group headings whose links are all `hidden`.
- DOM: `#fside > .fside-top > input#sideQ[type=search]` and `button#sideFoldBtn`; `#sideResults` (hidden when empty); `nav` with `p.fside-grp` headings; after each tab with sections, a `button.fside-arrow[data-side-toggle=view][aria-expanded]` and a `div.fside-subs[data-subs-of=view]` holding `button[data-side-go=view][data-side-sec=key]`.
- Layout: `#fside` is `position:fixed; left:0; top:var(--hdr-live); bottom:0; width:240px; overflow:auto`. `html.fside-folded` makes it 56 px wide, showing icons only (the existing `--ic` mask, with link text in `title`). Use `main, footer { margin-left: var(--fside-w) }`. On phones `#fside` is off-screen left, and `html.fside-open` slides it in over a backdrop `#fsideShade`.

- [ ] **Step 1: Write the failing check.** Create `test/e2e/sidebar.cjs` on the pattern of `test/e2e/layout.cjs` (static server for `public/`, offline init script `dmforge.offline=1`, its own port 8892, a `check(name, ok)` helper, and exit 1 on a failure). It should check:
  - `#fside nav a[data-view]` exist, and `header nav` doesn't;
  - clicking the "Campaign Tracker" arrow shows its 14 section buttons, and clicking "Loot" makes `#view-tracker` active (with a campaign made through `Store.save`, `.subtabs button.on` reads "Loot");
  - the Items "Magic" section checks `input[name=itMode][value=magic]`;
  - `#sideFoldBtn` folds the menu (width under 70 px), and after a reload it's still folded;
  - at 390×844, `#fside` is off-screen, `#mobileMore` opens it (`html.fside-open`), Escape closes it, and clicking a tab closes it.
- [ ] **Step 2:** `npm run test:sidebar` fails (no `#fside`).
- [ ] **Step 3:** Write the HTML, CSS, `14-boot.js` changes and the menu half of `21-sidebar.js` to the interfaces above.
- [ ] **Step 4:** `npm run test:sidebar` passes.
- [ ] **Step 5:** Commit: "Side menu: tabs on the left, sections, folding, phone panel".

### Task 2: Split the Compendium search

**Files:**
- Modify: `src/app/13g-compendium.js`
- Test: `test/e2e/sidebar.cjs`

**Interfaces:**
- Produces: `async compendiumMatches({ query: string, ed: "2014"|"2024", type?: string }) => { rows: Array<{kind,name,source,group,open,ed,rank}>, notice: string }`. These are the exact rows `compendiumSearch` builds today, sorted the same way. `compendiumSearch()` keeps its request counter and calls this.

- [ ] **Step 1:** Add a check: `await compendiumMatches({query:"fireball", ed:"2024"})` has a row with `kind === "Spell"` and `name === "Fireball"`, and the Compendium tab with "fireball" typed still lists Fireball.
- [ ] **Step 2:** The check fails (`compendiumMatches` isn't defined).
- [ ] **Step 3:** Move the matching body into `compendiumMatches`. It must not touch `#compendiumResults`, `compendium.*` or the request counter.
- [ ] **Step 4:** `npm run test:sidebar` passes, and so do `npm run test:all -- compendium session character-reference`.
- [ ] **Step 5:** Commit: "Compendium: matching split from drawing, for the side menu".

### Task 3: The search

**Files:**
- Modify: `src/app/21-sidebar.js`, `src/app.css`
- Test: `test/e2e/sidebar.cjs`

**Interfaces:**
- Consumes: `compendiumMatches` (Task 2), `sideGo` (Task 1), `PCS.roster`, `Store.list()`, `W.places` (after `worldAdopt()`), `npcLoose()`, `HB.list`.
- Produces:
  - `sideHits(text: string, obj: any, max = 1) => Array<{path: string[], text: string}>`. It walks the strings in `obj`, skipping keys `id`, `img`, `imgUrl`, `v`, `version` and any key ending in `At`, and returns the strings that contain every search word (using `compendiumText` on both sides).
  - `sideSearch(q: string): Promise<void>`, which fills `#sideResults` with three groups: "Your stuff", "Rules" and "Tabs". Each row is a `button[data-side-hit=index]`, holding the name in bold and a small line saying where the match is. The rows come from:
    - **Characters:** `PCS.roster`. The small line is the class and level, then a word for where the match was: the top-level key, mapped `spells`/`prepared`/`spell` → "spell", `inv`/`gear`/`items` → "item", `feats` → "feat", `notes` → "notes", and anything else → the key.
    - **Campaigns** (when the Tracker is allowed): `Store.list()`, through the keys `npcs`, `lore`, `quests`, `loot`, `sessions`, `encounters` and `notes`. The small line is `Campaign "<name>" · <sub-tab label>`.
    - **World places** (when World is allowed), **Your NPCs** (when NPCs is allowed) and **homebrew** (when Homebrew is allowed).
    - **Journal:** for players, when `#view-journal` has text, a single "Journal" row.
    - **Rules:** both editions, or only the edition from `currentSourceRules()` when one is set, ranked by `rank`. After them, "Show all N in the Compendium" fills `#compendiumQuery` and goes to `#compendium`.
    - **Tabs:** visible tab links and sections whose names match.
- Opening a hit:
  - character → `RC.id = id`, `CB.on = false`, `sideGo("roster")`, then `sideReveal("#rosterMain", hitText)`;
  - campaign → `activeId = c.id`, `sideGo("tracker", key)`, then `sideReveal("#campMain", item name or hitText)`;
  - place → `W.sel = id`, `W.open.add(id)`, `sideGo("world","place")`;
  - Your NPC → `sideGo("npc")`, then `sideReveal("#view-npc", name)`;
  - homebrew → `sideGo("homebrew")`, then `sideReveal`;
  - rule → `row.open(button)`;
  - tab → `sideGo`.

  On phones, opening a hit also calls `sideClose()`.
- `sideReveal(rootSel: string, text: string): void`, run after the tab is drawn (`requestAnimationFrame` twice):
  - it finds the deepest visible element under the root whose text contains `text`;
  - it opens any closed `<details>` above it;
  - it calls `scrollIntoView({block:"center"})` and adds the class `side-flash` for 1.5 s (a gold outline).
- Keyboard: ↓ from `#sideQ` goes to the first result, ↑/↓ moves between results, Enter opens one, and Escape clears the search (and on phones closes the panel).

- [ ] **Step 1:** Add the checks:
  - a saved Wizard character with Fireball prepared (made through `generateCharacter` or the forge, then `Fireball` put in its prepared spells, as `test/e2e/spell-cast.cjs` does);
  - typing "fireball" shows that character under "Your stuff", the Fireball spell under "Rules", and no "Tabs" group;
  - clicking the character opens `#view-roster` on it, with an element holding "Fireball" carrying `side-flash`;
  - clicking the spell opens the reference window;
  - typing "loot" shows a "Tabs" row that opens Tracker → Loot;
  - a character named `<img src=x onerror=window.__x=1>Bob` appears as text, and `window.__x` stays undefined;
  - Enter on the first result after ↓ opens it.
- [ ] **Step 2:** The checks fail.
- [ ] **Step 3:** Write the search to the interfaces above.
- [ ] **Step 4:** `npm run test:sidebar` passes.
- [ ] **Step 5:** Commit: "Side menu search: your things, the rules and the tabs".

### Task 4: Every page opens, for every kind of user; old checks moved over

**Files:**
- Modify: `test/e2e/sidebar.cjs`, plus the checks that used the header tabs: `layout.cjs` (`hdrToggle`, `#mobileMenu`), `qa-fixes.cjs:70`, `qa-browser.cjs:48`, `characters-tab.cjs:27`, and any other check `npm run test:all` shows failing because of the move.
- Modify: `src/app/18-news.js` (a NEWS entry), `README.md` (the tab section), `CLAUDE.md` (the code-file table gets `21-sidebar.js`, and the `test:sidebar` line), `docs/features/layout.md` (a "Side menu" section).

- [ ] **Step 1:** Add a walk of every page to `sidebar.cjs`, which collects `pageerror` and `console.error`:
  - **Offline**, at 1280×800 and at 390×844 (through More): click every visible `#fside nav a[data-view]` and every section button. After each click, check that `section.view.active` has the matching id, is visible, has text, and that there were no errors.
  - **Signed in as a DM, and as a player**, through `test/e2e/server.mjs` on port 8892 with `fake-identity.js`, set up as `test/e2e/chat.cjs` does: the same walk over the links that are visible. The player sees Characters, Spells, Journal and Chat, and doesn't see Campaign Tracker. A player's "loot" search shows no campaign rows.
- [ ] **Step 2:** Run `npm run test:all` and fix each failing check that clicked the header tabs. Point it at `#fside nav a`, or at the hash.
- [ ] **Step 3:** Write the NEWS entry (a new `id`, in plain words), README, CLAUDE.md and layout notes.
- [ ] **Step 4:** `npm test` and `npm run test:all` all pass.
- [ ] **Step 5:** Commit: "Side menu: every page checked for DM, player and offline; notes".
