# Extra books

About 3,700 open-licensed monsters, spells and magic items from books other than the SRD (Kobold Press, Spells That Don't Suck), from Open5e. Design: `docs/superpowers/specs/2026-11-20-extra-books-design.md`.

## Files

- `data/extra-monsters.json`, `extra-spells.json`, `extra-items.json`: plain lists in the 2014 SRD format. Each entry has `src`, its book's code. Monsters may have `envGuess: 1` (habitat worked out, not from the book). Magic items have `k`, Open5e's fixed key.
- `data/extra-books.json`: `books` (code → `name`, `short`, `by`, `authors`, `year`, `lic` (`ogl-10a` or `cc-by-40`), `url`) and `ogl`, the Open Game License text.
- **Remake them** with `python3 tools/convert-open5e-extras.py <open5e-api>/data/v2 data` (a `git clone --depth 1` of `github.com/open5e/open5e-api` is enough), then `npm run test:extras`. The book list is at the top of the script.
  - **Only `extra-monsters.json` was remade on 2026-11-24** (Open5e commit `bdcddf2`). Re-running the script today also changes `extra-spells.json` and `extra-books.json` from what's committed; check those diffs before keeping them.
  - **Monster fixes in the script (2026-11-24, QA pass 2):** a monster with no Actions in Open5e's `v2` files takes them from its `v1` file (`v1_actions`; Tome of Beasts 3's v2 data lacks almost all Actions), and Berberoka's attacks move out of its traits. `tidy_damage` cleans the damage lines: Black Flag mixes damage types, conditions and trait names ("Fey Resilience") in one line, so conditions in an immunity line go to Condition Immunities, other conditions are labelled "(condition)", trait names become "see …", and language lists get spaces. "B/P/S" is spelled out.
  - **Left as the books print them:** Black Flag gives no hit dice. About 17 monsters' hit points don't match their hit dice (e.g. Shadow Giant 209 for 22d20+66); the books disagree with themselves, and we can't tell which number is right. Boomer has no attacks in its book.
- `tools/build.mjs` turns them into `/assets/extra-*.js` (`DMDATA.spellExtra`, `monsterExtra`, `itemExtra`, `bookData`) and writes `public/credits.html`.

## In the app

- `dmData(key)` (`01-core.js`) appends the extras to both editions' lists, after the SRD entries, so SRD ids stay put. 2024 copies of spells get 2024 wording (`dmSpell2024`).
- Extra item ids are `<ed>-<k>` (`2014-vom_aberrant-agreement`); they are saved in inventories (`i.ref`), so never change `k`.
- Extra monster and spell ids are by position, like the SRD ones. Campaigns find monsters by name too, and characters keep spells by name.
- `dmBook(code)`, `bookTag(x)`, `bookLine(x)`, `bookOptions(list)` and `bookOk(x, value)` draw the tags, the Source line and the **Book** filter (`#spBook`, `#bsBook`, `#itBook`; values `""`, `"srd"` or a book code).
- **Everything that reads the rules data uses them:** random encounters (`randMonsters`), shops, hoards, spell scrolls, `pcSpellPool`, Wild Shape and companions.
- **The Adventure and Dungeon Map generators don't** (`MON` in `01-core.js`): saved dungeon maps are rebuilt from their seed, so changing that table would change them.

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

## Book reference spells (2026-11-23, owner's choice)

- **What:** `tools/build.mjs` adds every `kind: "Spell"` row of `data/book-references.json` that the Forge doesn't already have to the extra-spells list. It checks the free rules' names and aliases, so Tenser's Floating Disk stays the SRD Floating Disk.
- **Edition:** they keep their reference's edition (`ed`, all 2014 today), so 2014 handbook spells stay in the 2014 rules. The Compendium lists them once, as book references (`!spell.ref`).
- **Each one** carries `ref: true`, `src` and `page`, its stats from the reference (level, school, casting time, range, components, duration, first damage type and save), and an empty class list. Its description only points to the book page. The references hold no rules text, and none is added.
- **Where they show:** the Spells tab, the Compendium and spell search. Imports match them (`spellMatch`), so a character's Silvery Barbs stays on the sheet. Class filters and random picks don't use them, because no class list is known.
- **The check:** `npm run test:qafix`.
- **Their rules text (2026-11-23):** `data/reference-spell-text.json` holds a short summary for each of the 97 spells, written by the owner. `tools/build.mjs` joins it on as `d` (the summary, then "From <book>, page N."), `h` (the summary's "Upcast:" sentence) and `dt`. A spell without a summary still says "see the book". The check is `npm run test:qafix`. To add or change one, edit that file. The owner's export of the spells still missing text is made with bulk-import columns, so a filled-in copy can also go in through Homebrew → Bulk import.

## Book reference summaries (2026-11-26, owner's choice)

- **What:** `data/reference-summaries.json` holds short rules summaries, written in our own words, for book references that otherwise show only their book and page. It is keyed by kind (`"Feat"`, later `"Other rules"`, `"Monster"`, `"Species"`, `"Background"`), then by name. Use `"Name|book code"` when two books share a name (several "Other rules" do).
- **Build:** `joinSummaries` (`tools/ref-summaries.mjs`, called by `tools/build.mjs`) joins each one onto its reference as `sum`. The build stops on a key that matches no reference (a typo), and on a plain name that fits more than one reference (two books, or 2014 and 2024): use `"Name|book code"` there.
- **In the app:** `compendiumBookDetail` shows `sum` under the Source line, with the hint "A short summary. See the sourcebook for the full rules."
- **Done:** all 269 references that had no details: 83 feats, 163 Other rules (fighting styles, maneuvers, Metamagic, invocations, pact boons, Four Elements disciplines, Arcane Shots, runes, infusions), 12 monsters (mostly lore or "use this stat block" notes), 6 species and 5 background variants. Checked against the owner's compendium CSV ("DnD_Compendium v19.2 Session 28"); most of its rows for these had no text yet, and a few of its notes were wrong (Lifedrinker is 12th level, Thief of Five Fates has no prerequisite, Bursting Arrow has no save, Banishing Arrow's damage comes only at 18th level, Theros centaurs speak Sylvan).
- **Rarities (same day):** the 15 everyday items marked `Rarity: unknown` in `data/book-references.json` now say `none`, like the other everyday gear, and the Silver Sword says `legendary`. Left as unknown: Ivana's Whisper and the Horizon Puzzle Cube (not sure of their rarity). The 14 2024 "Other rules" entries still have no page: the CSV doesn't have them either.
- **Never paste the books' own text.** Write each summary fresh, short and in plain words (prerequisite first as "Needs: …").
- **The checks:** `test/ref-summaries.test.mjs` (in `npm test`: the join, its guards, and that every reference without details has a summary) and three lines in `npm run test:assets` (a feat, an "Other rules" entry, a rarity).

## Dungeon Master's Guide items (2026-11-26, owner's choice)

- **Free-rules links:** 358 of the guide's 423 magic item references are also in the free rules (SRD 5.1). `data/reference-srd-items.json` maps each reference name to its free-rules name (`"Ioun Stone, Agility"` → `"Ioun Stone of Agility"`; every Armor of <type> Resistance → Armor of Resistance). `joinSrdItems` (`tools/ref-summaries.mjs`) joins it on as `srd`, and the build stops if either name is missing. `compendiumBookDetail` then shows that item's full free-rules text (`itDetail`) under the book reference, saying what the free rules call it.
- **Summaries:** the other 65 (only in the guide, or "family" entries such as Ioun Stone or Instrument of the Bards) have a summary under `"Item"` in `data/reference-summaries.json`.
- **Every other book's magic items (same day):** 306 more summaries under `"Item"` (Tasha's, Xanathar's, Eberron, Ravnica, Glory of the Giants, Fizban's, Theros, Strixhaven, Volo's, Tome of Foes, Van Richten's, Monsters of the Multiverse). The Player's Handbook's Potion of Healing links to the free rules (`"phb-2014"` in `data/reference-srd-items.json`). Infernal Tack and Prosthetic Limb are in two books each, so their keys carry the book code.
- **General summaries:** 53 still say only what kind of item it is and end "Full rules on the page" (mostly Glory of the Giants, which the owner's item list marks as suspended, plus Eberron's mark items, Volo's mind flayer items and the artifacts). On 2026-11-26 the owner's magic item list ("DnD_Magic_Items_v19_2_Reviewed_Working.csv", which holds the books' text) was used to check and sharpen the rest, in our own words. It corrected: Slumbering Dragon's Wrath Weapon (a splash on a natural 20, not +1d6), Scaled Ornament stages, Dragonlance (extra damage only against dragons), Potion of Dragon's Majesty (the scale's kind), Shadowfell Brand Tattoo (darkvision 60, recharges at sunset), Shadowfell Shard, the water shard's cold damage, guild signets' DC 13, and Ersatz Eye's attunement. Never copy that file's text into the app.
- **The checks:** `test/ref-summaries.test.mjs` (the join, and every magic item reference has one or the other) and two lines in `npm run test:assets`.

## Subclass summaries (2026-11-26)

- All 104 subclass references have a level-by-level summary under `"Subclass"` in `data/reference-summaries.json`, written from the owner's compendium CSV notes (Artificer subclasses appear in two books, so their keys carry `|erlw` or `|tce`).
- **Only 43 of them show:** the Compendium hides a book reference when the same subclass, from the same book, is already playable (`compendiumMatches`), and 61 are (Gloom Stalker, Oath of Glory and the like), so those open their full progression instead. The other summaries are kept so the test can require one for every reference.
- **The checks:** "every subclass reference has a summary" in `test/ref-summaries.test.mjs`, and "a book subclass shows its summary" (Way of Shadow) in `npm run test:assets`.
