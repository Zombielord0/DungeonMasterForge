# Extra books

About 3,700 open-licensed monsters, spells and magic items from books other than the SRD (Kobold Press, Spells That Don't Suck), from Open5e. Design: `docs/superpowers/specs/2026-11-20-extra-books-design.md`.

## Files

- `data/extra-monsters.json`, `extra-spells.json`, `extra-items.json`: plain lists in the 2014 SRD format. Each entry has `src`, its book's code. Monsters may have `envGuess: 1` (habitat worked out, not from the book). Magic items have `k`, Open5e's fixed key.
- `data/extra-books.json`: `books` (code → `name`, `short`, `by`, `authors`, `year`, `lic` (`ogl-10a` or `cc-by-40`), `url`) and `ogl`, the Open Game License text.
- **Remake them** with `python3 tools/convert-open5e-extras.py <open5e-api>/data/v2 data` (a `git clone --depth 1` of `github.com/open5e/open5e-api` is enough), then `npm run test:extras`. The book list is at the top of the script.
- `tools/build.mjs` turns them into `/assets/extra-*.js` (`DMDATA.spellExtra`, `monsterExtra`, `itemExtra`, `bookData`) and writes `public/credits.html`.

## In the app

- `dmData(key)` (`01-core.js`) appends the extras to both editions' lists, after the SRD entries, so SRD ids stay put. 2024 copies of spells get 2024 wording (`dmSpell2024`).
- Extra item ids are `<ed>-<k>` (`2014-vom_aberrant-agreement`); they are saved in inventories (`i.ref`), so never change `k`.
- Extra monster and spell ids are by position, like the SRD ones. Campaigns find monsters by name too, and characters keep spells by name.
- `dmBook(code)`, `bookTag(x)`, `bookLine(x)`, `bookOptions(list)` and `bookOk(x, value)` draw the tags, the Source line and the **Book** filter (`#spBook`, `#bsBook`, `#itBook`; values `""`, `"srd"` or a book code).
- **Everything that reads the rules data uses them:** random encounters (`randMonsters`), shops, hoards, spell scrolls, `pcSpellPool`, Wild Shape and companions.
- **The Adventure and Dungeon Map generators don't** (`MON` in `01-core.js`): saved dungeon maps are rebuilt from their seed, so changing that table would change them.

## Compendium and spell grants

- Compendium loads the selected edition's reference index. Monster searches use an index of extra monster names and sources, then fetch full stat blocks when the reader opens a result. The monster index and reference catalogs are cached on first use.
- Book references with enough information to start a class, subclass, species, background, feat, or spell can prefill a homebrew draft for the DM. The draft is saved only through the regular Homebrew editor.
- `data/spell-grants.json` adds source-attributed 2014 spell summaries and sets the grants for book options. Grants resolve against the character's edition. Keep reference-only grants explicit until their spell data has been verified.
- The 2014 All-Purpose Tool variants have fixed item keys. The highest equipped, attuned variant modifies the artificer's spell attack and save DC. The table tracks the tool form and borrowed cantrip.

## Species, subclasses, feats and backgrounds

- `data/extra-options.json`: a list of **homebrew-shaped entries** (the Homebrew tab's saved format, `docs/features/homebrew-classes.md`) with `id: "book-<Open5e key>"`, `book: true` and `src`. 11 species (Tome of Heroes, with subraces), 97 subclasses (Tome of Heroes, Tal'Dorei, Open5e; one 2024 Wizard subclass), 14 feats and 25 backgrounds.
  - **Species:** `asi` and `speed` from the Ability Score Increase and Speed traits; Age, Alignment, Size and Languages go into the description; skill proficiencies and damage resistances in a trait's text become `skills` and `fx`. Subraces are `subs` with their own `asi` (applied in 2014 only, like the species' own) and `fx`.
  - **Subclasses:** feature levels from Open5e; a feature with no level comes at the class's subclass level. **A feature name two subclasses share gets the subclass in brackets** ("Expanded Spell List (Ancient Dragons)"), because the sheet finds feature text by name (`featDesc` → `HB_DESC`).
  - **Feats:** `req` is `wis13` for a plain ability minimum, else `@` and the text; `ab` from "Increase your X score by 1".
  - **Left out:** Black Flag's own classes and subclasses (another rules system, and the Mechanist has no proficiency table), and the Stoor Halfling (a subrace of a built-in species).
- `hbBook(kind)` (`07b-feats-homebrew.js`) reads them; **`hbAny(kind)` = the campaign's homebrew, then pending, then book entries**, so `hbApply`, `hbEffects`, `featDesc`, imports (`impHave`) and level-ups treat them like homebrew, and a homebrew entry of the same name wins. `hbOf` (the Homebrew tab, syncing) never includes them.
- `subclassList` adds them as `[name, desc, true, src]` and `featList` as `[..., false, src]` (not "Homebrew"; the Feats tab shows the book's short name). Species and backgrounds carry `src` (`PC_RACES[ed][name].src`, `HB_BG[name].src`); the builder shows the book's name.
- **Random characters never pick them** (`generateCharacter` skips `hb` species, `HB_BG` backgrounds and subclasses with `x[2]`), so a character's seed keeps giving the same choices when it levels up.

## Licences

Only OGL 1.0a and CC BY 4.0 books. `public/credits.html` lists each book, its licence, the OGL text and its section 15 notices, and is linked from every extra entry's details and from the licence notes under the lists. Never add a book without a licence from that list, and never add Wizards of the Coast's non-SRD books.
