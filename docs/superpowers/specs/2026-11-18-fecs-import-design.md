# Import from the Fifth Edition Character Sheet app: design

Date: 2026-11-18. Agreed with the owner in chat. A small change: short design.

## Why

A player's character comes from Walter Kammerer's **Fifth Edition Character Sheet** app (iOS and Android). Its export is an XML file (`.xml`, sometimes saved as `.json.xml`), which the Import character window refuses today. The owner wants it imported like Companion App and PDF characters.

## Goals

- `impCharRead` recognises the file (`<character>` with `<classData>`, `<abilityScores>`, `<noteList>`) and sends it to a new reader, `fecsImport(xml, ed)`.
- The reader makes the same Draft as `compImport` (`{src, opts, final, extras, homebrew, report}`), so `importBuild`, `importCommit`, the summary and pending homebrew all work unchanged. `src`: "Fifth Edition Character Sheet". `opts.bonus: "fixed"`.
- **Fields, from the open-source import5eChar reader** (positions 1-based; ⊠, ⊡, ⊟ are the separators):
  - **`classData`**, the first ⊟ piece, split by ⊠: per class, ⊡ gives class, subclass, level. Classes match `classList(ed)`. An unknown class is refused, as for the Companion App. An unknown subclass becomes pending homebrew (`impSubclass`).
  - **`abilityScores`**, split by ⊠: 1 to 6 are the final scores (STR to CHA), and 7 to 12 are the save flags (`appSaves`).
  - **`skillInfo`**, split by ⊠:
    - 1 to 18 are proficiency, in this order: Athletics, Acrobatics, Sleight of Hand, Stealth, Arcana, History, Investigation, Nature, Religion, Animal Handling, Insight, Medicine, Perception, Survival, Deception, Intimidation, Performance, Persuasion.
    - 39 to 56 are expertise, in the same order.
  - **`noteList`**, split by ⊠:
    - 1 features (to notes), 5 languages, 6 equipment (one item per line, through `impGear`), 7 notes;
    - 9 species, 10 background, 11 alignment;
    - 12 to 15 personality, ideals, bonds, flaws;
    - 16 name, 18 to 22 coins (cp, sp, ep, gp, pp).
  - **Species and background** match as in `compImport`. Otherwise they become pending homebrew, except that a background named "Custom", or none, means no background (listed in the report).
  - **`spellList`**, split by ⊠: 9 is the spells, split by ⊡. Each spell, split by ⊟, gives 1 level, 2 name and 8 prepared. Spells match with `spellMatch`, or a close spelling (`impDist`, for example "Pretidigitation" → Prestidigitation). **Anything still unknown goes into the character's notes and the report's "dropped" list. No homebrew spells are made** (the owner's choice: the app has no spell text).
  - **HP:** `maxHealth` is compared with the Forge's HP and listed under "differ", as for the other imports.
- **Errors:** a broken or unrecognised file says what to do in the app ("Export, or upload to Google Drive, and choose the .xml file").
- **Privacy:** the owner's real file isn't committed. The test uses a made-up character in the same format (`test/e2e/fixtures/fecs-sample.xml`).
- **Notes and news:** `docs/features/import.md`, plus a What's new entry.
- **Tests** (`npm run test:import`):
  - the sample imports with the right name, classes and levels (multiclass), subclass, scores, saves, skills and expertise, prepared spells, coins and equipment;
  - a misspelled spell is matched;
  - a non-spell entry lands in notes and in "dropped", not in homebrew;
  - "Custom" background means none;
  - a non-character XML file gets the friendly error.

## Approaches

There's one sensible way: a third reader feeding the existing Draft pipeline. A separate import flow would duplicate the summary, homebrew and commit steps for no gain.

## Left to the builder

- XML parsing: `DOMParser`, with the separator mojibake forms accepted as import5eChar does.
- The exact wording of the summary lines.
