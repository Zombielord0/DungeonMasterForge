# Importing: characters, MythWeaver, campaign files

Code: `src/app/16-character-import.js` and `17-mythweaver.js`; campaign files in `05-tracker.js`.

Moved here from `CLAUDE.md` on 2026-11-17, unchanged except that `public/index.html` now means the files in `src/app/` (see "How the page is built" in `CLAUDE.md`).

## Character import (2026-11-16)

- **Design and plan:** `docs/superpowers/specs/2026-11-16-companion-import-design.md` and `docs/superpowers/plans/2026-11-16-character-import.md`.
- **Readers make a Draft:** `{src, opts, final, extras, homebrew, report:{matched, made, differ, dropped}, appSaves?}`.
  - `compImport(json, ed)` reads the 5e Companion App's export (JSON, `jsonType:"character"`). Its `allRequiredClasses.jobs`, `requiredRace` and `requiredBackground` are JSON strings holding the full rules text.
  - Unknown classes refuse the import. An unknown subclass, species, background, feat or spell becomes a homebrew entry (`src: "5e Companion App"`), unless a homebrew entry with that name already exists (`impHave`).
  - Gear goes through `impGear` (counts like "20 Arrows", `eqGear` with extra tries). If the app marks nothing as equipped, weapons and armor start equipped.
  - `opts` always has `bonus: "fixed"`, so a level-up keeps the species bonus (`pcLevelTo` defaults to "flex").
- **`importBuild(draft)`** applies the draft's homebrew as pending for the build only, then solves the base scores so the final scores equal `final` (they can go below 3). It returns `{c, report}` without saving. Imported characters have `kitMoved`, `goldAdded` and `importedFrom: {app, at}`.
- **`importCommit(draft, c)`:** a signed-in player (`impPlayer()`) gets `c.hbPending` and nothing goes to the campaign. Otherwise each entry goes through `hbPut`.
- **The window** is `#impCharModal`, opened by `#impCharBtn` on My Characters: rules choice `impEd`, `#impCharFile`, summary `#impCharOut` (`impSummaryHTML`), and `#impCharGo`/`#impCharCancel`. `impCharRead` picks the reader by content: `%PDF-` goes to `pdfImport`.
- **Homebrew spells:** `kind: "spell"` (also in the API's `HOMEBREW_KINDS`) with `l, s, c, t, r, cp, m, du, co, ri, h` and `desc`. `hbSpellsApply()` appends them to `SP.data` (`hb: true`) after the built-ins; `spPrep` is the shared per-spell setup. Homebrew text limits are 4000 characters.
- **Pending homebrew:**
  - It's stored on the character as `c.hbPending`. `hbPendSync()` (run from `renderRoster`) gathers it into `HB.pend`, each with `pend: true` and `from: [{id, name}]`.
  - `hbAny(kind)` is used wherever a character is built. `hbOf(kind)` and every picker (`raceList`, `bgList`, `subclassList`, `featList` and the spell lists) leave pending out.
  - `pendKey(x)` = `kind|cls|name`. The DM's queue is `hbPendHTML()` (`#hbPendBox`, rows `data-pendrow`, buttons `data-pendact`); `hbApprove` and `hbReject` act on it.
  - Rejecting a subclass, feat or spell takes it off the character. A species or background stays, with `rejected: true`, and the sheet shows `hbRejectedHTML`.
  - Party cards show "N homebrew to approve".
- **PDF sheets:**
  - `pdfFields(buf)` loads pdf.js on demand from `public/vendor/pdfjs/` (legacy build of `pdfjs-dist` 6.5.438, Apache-2.0, unchanged; `netlify.toml` serves its `.mjs` as JavaScript). It reads each page's widgets with `getAnnotations()`; `getFieldObjects()` came back empty in this version. It returns `{fields:{name: value}, pos:{name:{page, x, y, x2, y2}}}`, and checked boxes read "Yes".
  - `pdfImport(F, ed)` maps the official sheet's field names, ignoring spaces and case (`Race `, `DEXmod `):
    - Check Box 11/18–22 are the saves; 23–40 are the skills in alphabetical order.
    - Expertise is inferred from a skill's number.
    - A spell line's level comes from its position: the nearest `SlotsTotal 19…27` header above it in the same column (`pdfSpellLevel`).
    - The subrace is guessed from the trait names in Features and Traits.
    - Unknown names become name-only homebrew.
    - `D.check` holds HP, AC, speed and spell DC, which `importBuild` compares after `pcRecompute`.
  - `spellMatch` is lenient. It ignores text in brackets and compares letters only, then tries a prefix (6+ letters), then an edit distance of 2. It also tries again without a leading wizard's name ("Tensers Floating Disc" → Floating Disk).
- **Tests:** `npm run test:import` (`test/e2e/char-import.cjs` plus `char-import-ui.cjs` and `char-import-pdf.cjs`), `npm run test:hbspell` and `npm run test:hbpend`.
  - The fixtures are `test/e2e/fixtures/companion-zook.json` and `sheet-wizard.pdf`. The PDF is made by `python tools/make-test-sheet.py` (needs pypdf) with the official sheet's names and spell positions.
  - Players' own PDFs aren't committed.

## Lore tab and MythWeaver import (2026-11-17)

- **Design and plan:** `docs/superpowers/specs/2026-11-17-mythweaver-import-design.md` and `docs/superpowers/plans/2026-11-17-mythweaver-import.md`.
- **Lore:** `c.lore = [{id, mwId?, name, type, tags[], imgUrl?, desc, sections:[{t, x, dm}], src?}]`.
  - Types are in `LORE_TYPES` (place, item, monster, encounter, other). `blankCampaign` and the Forge campaign import add `lore: []`, and `renderTracker` makes sure older campaigns have it.
  - The tab is `subTab === "lore"` → `loreHTML(c)`, with UI state in `LORE` (q, type, open, edit, draft). `loreRender()` redraws just `#subBody` and keeps focus in `#loreQ`.
  - Buttons are `data-lore` (open, add, edit, save, cancel, del, tv, secadd, secdel), with chips `data-lt` and fields `data-lf`/`data-ls`. The listeners sit right after `const campMain`.
- **`mdHTML(text)`:** escapes everything first, then formats `**bold**`, `*italic*`, `#`–`###` headings, `-`/`1.` lists and paragraphs. Use it for any user or imported text you want formatted.
- **MythWeaver** (`format: "mythweaver-account-export"`):
  - `mwRead(json)` never reads `account`. It keeps campaigns, `otherLore`, characters and the image count.
  - `mwText` turns HTML into markdown-ish text. `mwLore` and `mwNpc` map entries; `mwTagType` sorts "generic" entries by their tags.
  - `mwPlanCamp(R, i, existing)` builds or updates a Tracker campaign (`c.mwId`, `c.mwAt`). It matches NPCs, lore and sessions by `mwId`, never deletes, keeps an NPC's attitude and uploaded picture, and puts `otherLore` in every campaign tagged "Account".
  - `mwChar(ch, ed)` makes a character Draft with `D.base`: MythWeaver scores are starting scores, so `importBuild` builds once instead of solving.
- **The window:** `#impCampModal` (`impCampOpen`, `mwWindowHTML`, `mwCommit`), opened by the Tracker's **⬆ Import campaign** (`#importFile`), which still imports Forge campaign files.
  - `mwCommit` writes with `Store.lsWrite()` straight away and restores the old campaigns if the browser is full.
- **Real export (2026-11-16, not committed):** Undead Titan has 63 NPCs, 172 lore entries and 14 sessions, about 1.4 MB, and imports in under 2 s.
- **Tests:** `npm run test:lore` (`test/e2e/lore.cjs`) and `npm run test:mythweaver` (`test/e2e/mythweaver.cjs` plus `mythweaver-ui.cjs`), with the made-up fixture `test/e2e/fixtures/mythweaver-sample.json`.

## Campaign files carry custom content (2026-11-17)

- **Export JSON** (`#exportCamp`) writes the campaign plus `extras: campExtras()` = `{items: IT.custom, homebrew: HB.list, monsters: MB.lib}`.
- **Import JSON** (`#importFile`) strips `extras` off the campaign and passes it to `campExtrasAdopt(ex)`, which adds what this browser doesn't have (same id, or same name and text, counts as a match):
  - custom items into `IT.custom` (Items → Custom, ready for Give/Buy), saved with `itPersist`;
  - homebrew through `hbPut` (skipped for signed-in players, who can't add homebrew);
  - custom monsters into `MB.lib`, then `bsCustomRefresh`.
- The loot "Give to…" handler now looks up custom items as well as built-ins, so the inventory row links (`ref`) to the custom item.
- **MythWeaver:** `mwExtras(R, camps)` turns the chosen campaigns' lore (plus `otherLore`) into `{items, homebrew}` for the same `campExtrasAdopt`:
  - `type: "item"` lore (or tag-sorted as item) → a custom item built through `ciNew` + `ciRecord`, so Edit works. The category comes from the name, tags and first line (`MW_ITEM_CAT`); rarity and attunement from the text. It carries `mwId: "mw-<id>"`, and a re-import replaces it in place.
  - `type: "spell"` or a "Spell" tag (`mwIsSpell`) → a homebrew spell, with level, school, casting time, range, components and duration read from the text, and classes from tags.
  - Built-in items and spells (exact name) are skipped. DM-only sections are left off. Everything stays in Lore.
  - The window shows a ticked `[data-mwextras]` box with the counts; the Go handler adopts after `mwCommit`.
- **Tests:** `npm run test:campextras` (`test/e2e/camp-extras.cjs`), Forge files and MythWeaver.
