# Extra books (open-licensed monsters, spells and magic items): design

Date: 2026-11-20. Agreed with the owner in chat.

## Why

The owner asked to fill the library by scraping 5e.tools. That site carries Wizards of the Coast's paid books, which can't be republished on a public site (owning the books doesn't change that), so it was declined. The owner chose instead the **free extras**: books their publishers released under the Open Game License 1.0a or Creative Commons Attribution 4.0, as collected by Open5e (`github.com/open5e/open5e-api`, `data/v2`). The owner picked all three kinds, and asked that the generators use them too ("use the lists and random picks to better build out the generators").

## What's in

| Kind | Books (Open5e code) | Count |
| --- | --- | --- |
| Monsters | Tome of Beasts 1, 2023 edition (`tob-2023`), the 2016 Tome of Beasts for what 2023 dropped (`tob`), Tome of Beasts 2 and 3 (`tob2`, `tob3`), Creature Codex (`ccdx`), Black Flag SRD (`bfrd`) | 1,695 |
| Spells | Deep Magic (`deepm`), Deep Magic Extended (`deepmx`), Tome of Heroes (`toh`), Kobold Press compilation (`kp`), Warlock zine (`wz`), Spells That Don't Suck (`spells-that-dont-suck`) | 920 |
| Magic items | Vault of Magic (`vom`) | 1,062 |

Left out: Level Up Advanced 5e (`a5e-*`; its own rules), species, classes, feats and backgrounds (they'd need builder rules work; a possible next step).

## How

- **`tools/convert-open5e-extras.py <open5e>/data/v2 data`** writes `data/extra-monsters.json`, `extra-spells.json`, `extra-items.json` (plain lists in the 2014 SRD format, each entry with `src`, its book's code) and `extra-books.json` (each book's name, short label, publisher, authors, year, licence and link, plus the OGL text).
  - Monsters go through `convert()` in `tools/convert-srd-monsters.py` (made a function; it still writes the same `data/monsters.json`).
  - **Skipped:** names that match an SRD entry (Black Flag's own goblins, a Feather Token), and a name already taken by an earlier book in the list.
  - **Habitats** (`env`), for random encounters: the 2016 Tome of Beasts lists them, and the 2023 edition borrows them by name. A list naming more than 12 places (sea included) counts as unknown. The rest are worked out from the name, trait names, speeds and type (`guess_env`, marked `envGuess: 1`): a best guess.
  - Spell ranges are written "60 feet"; class names lose Open5e's `srd_`.
  - Magic items keep Open5e's key as `k` (`vom_aberrant-agreement`), so their ids never shift.
- **Build:** `tools/build.mjs` makes the four files fingerprinted scripts (`DMDATA.spellExtra`, `monsterExtra`, `itemExtra`, `bookData`), loaded after the SRD scripts, and writes **`public/credits.html`** (the books, their licences, the OGL text and its section 15 notices).
- **Loading:** `dmData` joins the extras to the end of both editions' lists, so SRD ids (saved in campaigns and inventories) don't move. Each edition gets its own copy, since the tabs add fields to each entry. 2024 spells get 2024 wording ("Action"). Extra items' ids are `<ed>-<k>`.
- **Lists:** a **Book** filter in Spells, the Monster Manual and Items ("Any", "Official rules (SRD)", each book), a book tag on rows (hidden on phones), and a Source line with a credits link in the details. The licence notes under each list mention the books.
- **Generators:** anything that reads the rules data gets the extras without changes: random encounters (Tracker), shops, treasure hoards, spell scrolls, the class spell lists characters choose from, Wild Shape and companions.
  - **Not changed:** the Adventure and Dungeon Map generators use their own curated monster table (`MON` in `01-core.js`). Dungeon maps are rebuilt from their seed each time they open, so changing that table would change maps people have already saved. That needs its own design.

## Second part: species, subclasses, feats and backgrounds (owner's request, same day)

The owner asked for these next ("Add species classes and feats and the bulk import"). They come as homebrew-shaped entries in `data/extra-options.json`, joined after the campaign's own homebrew by `hbBook`/`hbAny`, so the whole homebrew machinery (pickers, sheet effects, feature text, imports) works unchanged. Black Flag's new classes were left out: their data is incomplete and they use Black Flag's own rules. Random characters keep to the official rules because their seed is reused on level-up. Details: `docs/features/extra-books.md`.

## Size

About 1.1 MB more to download (compressed), once: after that the service worker keeps the files, and turning the text into lists still waits until a tab needs it (under 0.1 s each).

## Tests

`npm run test:extras`: the data files (no SRD names, no repeats, known books and licences, habitats, item keys), both editions' lists, SRD ids unchanged, 2024 wording, the Book filters and Clear filters, tags and Source lines, random encounters rolling extras in every place, hoards and shops stocking Vault of Magic items, and the credits page.
