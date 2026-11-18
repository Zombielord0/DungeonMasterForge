# Fifth Edition Character Sheet import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Import character window reads the Fifth Edition Character Sheet app's XML export.

**Architecture:** `fecsImport(xml, ed)` in `src/app/16-character-import.js` builds the same Draft as `compImport`. `impCharRead` sends files starting with `<?xml` or `<character` to it. Spells reuse `spellMatch`; gear reuses `impGear`; subclasses reuse `impSubclass`. HP and speed use the PDF reader's `D.check` comparison.

**Tech Stack:** Vanilla JS (`DOMParser`), Playwright checks.

**Spec:** `docs/superpowers/specs/2026-11-18-fecs-import-design.md`

## Global Constraints

- Field positions exactly as the spec lists them (1-based there; 0-based in code).
- Separators: ⊠ (`⊠`), ⊡ (`⊡`), ⊟ (`⊟`).
- Unknown spells: no homebrew. The name goes into notes, and the report's `dropped` gets `"<name> (not a known spell; saved in notes)"`.
- `D.src = "Fifth Edition Character Sheet"`. Homebrew entries made here carry that `src`.
- The owner's real file is never committed. The fixture is invented.

## Review Focus

1. **Counts in equipment lines** ("holy water x5", "3x kegs", "pogs 100x") come in with the right quantity. Test in Task 1.
2. **A file with empty optional fields** (no spells, no equipment, no coins) still imports. Test in Task 1.
3. **Text from the file is escaped wherever the summary or sheet shows it:** a name with `<b>` shows as text. Test in Task 1.
4. **An XML file that isn't a character** (or a broken one) gets the friendly error, not a crash. Test in Task 1.
5. **A Companion App JSON and a PDF still go to their own readers.** The existing `test:import` checks cover this.

---

### Task 1: The reader

**Files:**
- Create: `test/e2e/fixtures/fecs-sample.xml` (invented: "Wren Ashdown", Paladin 5 Oath of Devotion / Bard 2, Tiefling, background Custom, chaotic good, a misspelled spell "Cure Wouds", a non-spell "Plus 1 To Smiting", equipment with "x5" and "3x" counts, gp 120, fighting style Defense)
- Modify: `src/app/16-character-import.js` (new `fecsImport`, `FECS_SKILLS`, `fecsQty`; `impCharRead`)
- Test: `test/e2e/char-import.cjs` (before the UI part)

**Interfaces:**
- Produces: `fecsImport(xmlText: string, ed: "2014"|"2024") → Draft | {error}`.
- Produces: `fecsQty(line) → string`, which turns "holy water x5", "3x kegs" and "pogs 100x" into "5 holy water", "3 kegs" and "100 pogs" for `impGear`.

- [ ] **Step 1: Write the failing checks** (evaluate in the page with the fixture text):
  - The name is "Wren Ashdown". The classes are Paladin 5 (subclass Oath of Devotion, or Devotion as named in `subclassList`) and Bard 2. The species is Tiefling. There is no background, and the report mentions Custom.
  - The scores equal the file's (16, 10, 14, 8, 12, 16) after `importBuild`.
  - Skills include Athletics, Performance and Persuasion. Athletics is in `keepExpert`.
  - Prepared spells include Cure Wounds (matched from "Cure Wouds"). "Plus 1 To Smiting" is in `extras.notes` and in `report.dropped`, and there's no homebrew spell.
  - `extras.coins.gp === 120`. Holy water has qty 5. Kegs have qty 3.
  - Fighting style Defense is in `extras.fightStyles`.
  - Alignment "Chaotic Good".
  - A fixture copy with every spell, equipment and coin field emptied still imports.
  - A copy with the name `<b>Bold</b>`: after importBuild, the summary HTML (`impSummaryHTML`) contains `&lt;b&gt;` and no `<b>Bold`.
  - `impCharRead` on `<?xml version="1.0"?><notes/>` → an error message mentioning Fifth Edition Character Sheet. A broken `<character><classData>` → an error, no throw.
- [ ] **Step 2: Run** `npm run test:import`. Expected: FAIL (`fecsImport` not defined).
- [ ] **Step 3: Implement** `fecsImport` following the spec's field map. Use `compImport`'s species, background, gear and extras code as the pattern, and set `D.check = { hp: maxHealth, speed: baseSpeed + speedMiscMod }`.
- [ ] **Step 4: Run** `npm run test:import`. Expected: PASS. Also check the owner's file by hand (outside git): it imports as Paladin 8 / Bard 1, and Oathbreaker is homebrew.
- [ ] **Step 5: Commit.**

### Task 2: Notes and What's new

- [ ] `docs/features/import.md` (a "Fifth Edition Character Sheet" bullet). `NEWS` entry `2026-11-18-fecs-import`.
- [ ] **Run** `npm test` and `npm run test:all`. Expected: PASS.
- [ ] **Commit.**
