# Bulk import (2026-11-20)

Homebrew tab → **📥 Bulk import from a file**. A DM adds many entries at once, for example content typed in from books they own (the owner asked for it after the Forge declined to copy Wizards of the Coast's books into the site). Code: `src/app/12b-bulk-import.js`. Check: `npm run test:bulk`.

## Files it reads

- **CSV**, as Excel, Numbers or Google Sheets save it: commas, semicolons or tabs between cells (picked from the header row), quoted cells with line breaks, a UTF-8 BOM. The header row names the columns; names are lowercased with underscores (`Casting Time` → `casting_time`), and a few aliases work (`desc`, `text` → `description`; `cls` → `class`; `asi` → `ability_bonuses`…, `BI_ALIAS`).
- **JSON**: a list of objects with the same column names (or `{ entries: [...] }`); list values are joined with commas.
- A `kind` column on every row (`spell`, `feat`, `species`, `background`, `subclass`, `item`, `monster`; plurals and `race` work, `BI_KIND`). A CSV with no kind column is read as the template whose columns it has.
- Limits: 5 MB and 3,000 rows (`BI_MAX_BYTES`, `BI_MAX_ROWS`).

## Templates

The window has a download per kind (`biTemplate`): a header row and made-up example rows (`BI_COLS`, `BI_EXAMPLE`).

| Kind | Columns | Becomes |
| --- | --- | --- |
| spell | name, level (0 or "cantrip" to 9), school, classes, casting_time, range, components, material, duration, concentration, ritual, description, higher_levels | homebrew spell |
| feat | name, prerequisite ("Dexterity 13", "Spellcasting" or any text), ability_increase ("Strength or Dexterity", "any"), description | homebrew feat |
| species | name, speed, ability_bonuses ("dex +2, wis +1"), skills, description, trait, trait_text, subrace | homebrew species: **one row per trait or subrace**, same name. A row with `subrace` is a subrace (its `trait_text` and `ability_bonuses` are the subrace's). Only the first skill is kept (the editor's limit). |
| background | name, skills (two), equipment, feature, feature_text, description | homebrew background |
| subclass | name, class, description, level, feature, feature_text | homebrew subclass: **one row per feature**, same name and class; no level = the class's subclass level |
| item | name, type, rarity, attunement, description | Items → Custom (`loreItemDraft` + `ciRecord`, like Lore items) |
| monster | name, stat_block (the whole stat block in one cell) | My monsters (`loreMonster`, like Lore monsters); with no AC, HP and six scores it's added as text only (`needsStats`) |

Yes/no cells take yes, y, true, 1, x or ✓.

## How it works

- `biRead(text)` → rows; `biPlan(rows)` groups rows by kind, name (and class for subclasses), skips what the Forge already has (`biHave`: the campaign's homebrew, pending homebrew, the extra books, the built-in rules, Items, My monsters), and builds each entry with `BI_MAKE[kind]`. Problems (unknown kind, class, school, level; text cut to the editor's 4,000 characters) are listed, and the entry is added as noted or left out.
- **Homebrew entries are built through the editor's own `hbNew` → `hbItemOf`**, so they have the same fields and limits as hand-made ones. `hbItemOf` now keeps a subrace's `asi` (also used by the book species), so editing a species doesn't lose it.
- `biCommit`: homebrew goes to this browser in one write (`HB_KEY`, `hbSet`), or, signed in as the campaign's DM, to the campaign one entry at a time (`Portal.hbPut`, with a count on the Add button); items through `itPersist`, monsters through `mbSaveLib`. Imported homebrew is shared with the campaign's players like any homebrew.
- Players in a campaign don't see the button (the Homebrew tab is DM-only there).
- Not supported: whole classes (use the Homebrew tab's class editor), sheet effects (`fx`; add them in the editor afterwards).
