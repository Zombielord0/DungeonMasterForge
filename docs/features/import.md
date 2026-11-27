# Importing: characters, MythWeaver, campaign files

Code: `src/app/16-character-import.js` and `17-mythweaver.js`; campaign files in `05-tracker.js`.

Moved here from `CLAUDE.md` on 2026-11-17, unchanged except that `public/index.html` now means the files in `src/app/` (see "How the page is built" in `CLAUDE.md`).

## Character import (2026-11-16)

- **Design and plan:** `docs/superpowers/specs/2026-11-16-companion-import-design.md` and `docs/superpowers/plans/2026-11-16-character-import.md`.
- **Readers make a Draft:** `{src, opts, final, extras, homebrew, report:{matched, made, differ, dropped}, appSaves?}`.
  - `fecsImport(xml, ed)` (2026-11-18) reads Walter Kammerer's Fifth Edition Character Sheet app (XML; lists joined by ⊠, ⊡, ⊟, positions from the open-source import5eChar reader). `impCharRead` sends any text starting with `<` to it. Design: `docs/superpowers/specs/2026-11-18-fecs-import-design.md`.
    - `classData` (first ⊟ piece; ⊠ per class; ⊡ class, subclass, level), `abilityScores` (1-6 scores, 7-12 saves), `skillInfo` (1-18 proficient, 39-56 expertise, order in `FECS_SKILLS`), `spellList` (piece 9: ⊡ per spell, ⊟ level, name, …, prepared at 8), `noteList` (`note(i)` 0-based: 0 features, 3 tools, 4 languages, 5 equipment, 6 notes, 8 species, 9 background, 10 alignment, 11-14 personality, 15 name, 17-21 coins, 22 XP).
    - Unknown spells are not made into homebrew (the file has no spell text): they go to notes and `report.dropped` (owner, 2026-11-18). Non-SRD spells like Silvery Barbs land there too.
    - A "Custom" (or empty) background is kept as a plain name with no features, so the generator doesn't roll one. `fecsQty` turns "x5", "3x", "100x" counts into `impGear`'s "5 …" form. HP and speed are compared through `D.check`.
    - Test file: `test/e2e/fixtures/fecs-sample.xml` (an invented character). Never commit a player's own export.
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
    - **Feats (2026-11-27):** each line of Features and Traits and Feat+Traits is cut at the first `:`, ` - `, `(`, `.` or `,` (after a bullet or `Feat:`), and an exact name (letters only) from `featList(ed)` (built-in, book and campaign feats) becomes a bonus feat (`impFeatsFromText`). A 2024 background's own feat is skipped. **A bare line whose name is also a class or species feature** (`impFeatClash`: `FEAT_DESC`, `SUB_DESC`, species traits, `FIGHT_STYLES`, Ability Score Improvement; for example a Halfling's "Lucky") is skipped with a note under "Different from the file", unless it says `Feat:` or sits under a "Feats" heading line. The full text still goes to the notes.
    - **Magic items (2026-11-27):** an equipment line that isn't gear (`impGear` finds nothing) is matched by exact name to the magic item list, the free rules first and then the extra books (`impMagic`); the inventory entry gets its `ref`, so it shows its rules. A "+1" weapon or "Dagger of Venom" still becomes the base weapon, as before.
    - `D.check` holds HP, AC, speed and spell DC, which `importBuild` compares after `pcRecompute`.
  - `spellMatch` is lenient. It ignores text in brackets and compares letters only, then tries a prefix (6+ letters), then an edit distance of 2. It also tries again without a leading wizard's name ("Tensers Floating Disc" → Floating Disk).
- `importBuild` keeps `D.opts.bonusFeats` on the character as `c.bonusFeats`, so a level-up keeps imported feats (Companion App and PDF; before 2026-11-27 they were only on the first build).
- **Tests:** `npm run test:import` (`test/e2e/char-import.cjs` plus `char-import-ui.cjs` and `char-import-pdf.cjs`), `npm run test:hbspell` and `npm run test:hbpend`.
  - The fixtures are `test/e2e/fixtures/companion-zook.json` and `sheet-wizard.pdf`. The PDF is made by `python tools/make-test-sheet.py` (needs pypdf) with the official sheet's names and spell positions.
  - Players' own PDFs aren't committed.

### Spelling and matching (2026-11-23)

- **Spelling mistakes:** `impFuzzy(tiers, raw, part)` matches a name from a file: the same letters first, then (subclasses only, `part`) a name that starts or ends with it ("Devotion" -> "Oath of Devotion"), then, for names of 5+ letters with the same first letter, one letter wrong, missing or extra, or two letters swapped. Never more: near-misses like Warforged/Gearforged or Child of the Sun/Sea are different things. Two names equally close is no match; `[UA]` names are matched exactly only. A corrected name is listed under "Different from the file" (`impReport`) so the user checks it. Used for classes (`impClassMatch`), subclasses (`impSubclass`), species (`impSpeciesMatch`), backgrounds and feats (`impListMatch`) in the Companion App, Fifth Edition Character Sheet and MythWeaver imports.
- **Order:** built-in, then the extra books, then the DM's homebrew, then a book subclass printed for the other rules set (Oathbreaker with 2024 rules), and last homebrew an earlier import made (`hbFromImport`: `src` is an import app).
- **A Companion App subclass known only by its id** (`paladin_oathbreaker`) drops the class name.
- **Import-made homebrew never hides the real one:** `subclassEntry` skips a homebrew subclass with an import `src` when a built-in or book subclass has its name, and `hbApply` applies import-made classes after the book classes. A DM's own homebrew of the same name still wins. `subclassEntry` also finds a book subclass from the other rules set when nothing else has the name.

### Changing a subclass after import (2026-11-23)

- **Change** next to the subclass on the sheet (`data-subchange` in `lvBarHTML`) opens the subclass picker (`lvOpen(c, true, true)`, `LV.change`) with the current subclass picked.
- **Confirming** sets `c.subclass` and rebuilds at the same level (`pcLevelTo`), so scores, skills and choices stay (`pcKeep`) and the new subclass's features replace the old ones.
- **Why:** it fixes characters that an earlier import tied to a homebrew copy (for example "OathBreaker" with no features) when the book version now exists.
- **The check:** `npm run test:subchange`.
- **Only the main class** can be changed this way. A second class's subclass is still chosen through levelling.

### Book subclass abilities (2026-11-23)

- **Book subclass features** (`bookSub` on `c.feats`) now join the Abilities list when `SUB_ABL` or `ACT` knows them.
- **Our own short summaries** sit in `SUB_ABL[...].text`: Aura of Hate, Channel Divinity: Control Undead and Dreadful Aspect, the last two spending the `channel` counter.

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


### Lore entries fill their tabs (2026-11-18)

- Saving a Lore entry (`data-lore="save"`) calls `loreLink(c, entry)` in `05-tracker.js`. Places already went to the World (`worldAdopt`).
  - **Item** → `IT.custom`, built by `loreItemDraft(L)` (shared with MythWeaver's `mwExtras`): type from the name and tags, rarity and attunement from the text, DM-only sections left out.
  - **Monster** → `MB.lib`, built by `loreMonster(L)` (MythWeaver's `mwMonster` now calls it): a stat block in the text gives the numbers, otherwise `needsStats`.
  - **Encounter** → `c.encounters`, built by `mwEncounter(l, c, idx, "Made from the Lore entry")` with the monsters its text names.
- The made record carries `loreId` (the Lore entry's id). Saving the entry again updates that record: an item is rebuilt, a monster gets its name and text (and its numbers only while it still `needsStats`), an encounter gets its name and notes (and monsters only while it has none).
- `ciSave` (the Items builder) marks a Lore-made item `loreOff`; Lore saves leave it alone from then on.
- Nothing is made when a custom item, built-in item, My monster or encounter of the same name already exists (and isn't the linked one).
- Deleting the Lore entry leaves what it made. Deleting the made record and saving the Lore entry again makes a new one.
- Check: `npm run test:lorelink`.

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

## Gender on import (2026-11-17)

- `impGender(src, texts)` (in `src/app/16-character-import.js`) looks for a key named gender, sex or pronouns anywhere in `src`, then counts he/him/his against she/her in the character's own story `texts` (2 or more, and twice the other). "he or she" and "his/her" don't count. The Forge only has male and female names, so a field like "they/them" leaves it unset.
- `impGenderSet(D, G)` sets `D.opts.gender` and adds "Gender: … (from the file / the backstory)" to the report, or a note that one was picked.
- Companion App: `about`, `personalityTraits`, `ideals`, `bonds`, `flaws` and notes. PDF: fields named like gender, sex or pronouns, plus Backstory, PersonalityTraits, Ideals, Bonds, Flaws and Allies. MythWeaver: the whole raw character (`raw`, kept by `mwRead`).

## Names written differently, weapons and extra AC (2026-11-26)

The owner asked for imports to "code for naming mismatches", after a real Fifth Edition Character Sheet file came in with unmatched gear.
- **`impGear`** (used by every importer) tries, in order:
  1. the exact name (`impGearFind`: "set of" dropped, "… Armor" added, a two-word name turned round, a squashed name split, the same letters);
  2. a magic version's base ("Shield +1");
  3. the exact name again;
  4. a named version's base ("Morningstar Of Bleeding");
  5. everyday names (`IMP_GEAR_SYN`: holy symbol is an Amulet, bolts are a Crossbow bolt…);
  6. the last word or words ("belt pouch" is a Pouch);
  7. a small typo (`impFuzzy`).

  A plain match takes the Forge's name. A magic or named version keeps its own name on the base item, so the sheet still reads its +N and attacks with it. "(20)" counts are read.
- **Ammunition:** the Forge's arrows and bolts weigh a bundle of 20, and imports count single pieces, so `impW` gives each piece a twentieth.
- **The Fifth Edition Character Sheet weapon list** (`weaponList`: a count, then 13 fields a weapon) is read. A weapon already in the gear takes the list's name; a new one is added and worn. One the Forge can't identify is kept as an item, with a report line.
- **Other AC bonus** (`c.acBonus`, a saved number, `PC_NUMS`): added by `pcAC` as "Other +N" and editable under Armor class on the sheet (`data-acbonus`). It's user-set, so it stays out of the `pcLevelTo` copy list. Fifth Edition Character Sheet files fill it from `miscArmorBonus`, and the report compares the file's own AC.
- **Martial weapons from a subclass** (`SUB_MARTIAL`): 2014 Tempest and War Domains, and the College of Valor.
