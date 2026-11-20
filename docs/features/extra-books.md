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

## Licences

Only OGL 1.0a and CC BY 4.0 books. `public/credits.html` lists each book, its licence, the OGL text and its section 15 notices, and is linked from every extra entry's details and from the licence notes under the lists. Never add a book without a licence from that list, and never add Wizards of the Coast's non-SRD books.
