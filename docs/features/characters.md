# Characters: how a sheet is built, its fields, the sheet checks, spell cards

Code: `src/app/07-character-generator.js` (generateCharacter), `09-character-sheets.js`, `12-level-homebrew-feats.js` and `13-my-characters.js`. **Read this before changing sheet maths**, and run `npm run test:sheet` after.

Moved here from `CLAUDE.md` on 2026-11-17, unchanged except that `public/index.html` now means the files in `src/app/` (see "How the page is built" in `CLAUDE.md`).

## How a character is built (read this before changing sheet maths)

- `generateCharacter(o)` builds the whole sheet from options with a seeded RNG (`makeRng`), so the same inputs give the same sheet.
- Level changes never patch numbers directly. They go through `pcLevelTo(c, lv)`, which regenerates the character with `subclass`, `asiPicks` and `bonusFeats` and copies the derived fields back (level, scores, mods, saves, skills, hp, ac, attacks, spell, feats, traits, res/imm/vul/cimm/sadv, hbSig and so on).
- `pcLevelTo`, `lvBuild` and `pcRebuild` also pass `pcKeep(c)`: the character's base scores, rolls, skill picks, expertise order and Skilled picks. That way a rebuild never re-rolls them. Don't remove it.
- If you add a derived field to the character, add it to the copy list in `pcLevelTo`, or levelling up will drop it.
- Order inside the generator:
  1. Pick the subclass, before rolling scores.
  2. The ability increase: the background's in 2024 (`bgAbilityBonus`, unless `bgAsiLegacy`), otherwise the species' or a flexible +2/+1. Then ASI picks, bonus feats and homebrew ability bonuses.
  3. Skills and expertise: background, species, class and Skilled picks. Kept skills and expertise come first on a rebuild.
  4. HP. Tough gives +2 per level (including Tough as a 2024 Origin feat); Boon of Fortitude gives +40. Draconic sorcerers add their subclass HP.
  5. Saves.
  6. AC.
  7. Attack and initiative bonuses. Alert adds proficiency in 2024 and +5 in 2014.
  8. Spell bonus.
  9. Speed.
  10. Defences.
- Loading an older save goes through `pcEnsure`, which runs migrations such as `withTraitRes`, `raceLvUpgrade` and the background version (`bgV`). New data fields need a migration there too.
- On **My Characters**, a sheet with an inventory (`kitMoved`) gets its AC, speed and attacks from `pcACApply`, `pcSpeedApply` and `pcAttacks` (equipment, active effects and spell toggles), not from the generator's values.

## Character fields worth knowing

`subclass`, `asiPicks`, `bonusFeats`, `res`, `imm`, `vul`, `cimm`, `sadv`, `hbSig` (homebrew signature used to detect stale sheets), `initBonus`, `atkBonus`, `spell.bonus`, `raceLv`, `hpCur`.

From PR #5:
- **Derived**, so they're in the `pcLevelTo` copy list:
  - `hbAc` and `hbSpeed`: the homebrew AC and speed bonuses, kept apart so equipment AC and calculated speed can add them.
  - `subHp` and `subSpd`: subclass bonuses already applied.
- **Stored on the sheet:** `inv[].eq`, `kitMoved`, `used`, `active`, `fx`, `fightStyles`, `acManual`, `speedManual`, `formHp`.
- **Backgrounds:** `bgV`, `bgAsiLegacy`, `startGold` / `goldAdded`, `skilled`, `expertOrder`. `skilled` and `expertOrder` are also in the `pcLevelTo` copy list.
- **In the browser:** `dmforge.newsSeen` (What's new entries already seen).
- **Items 18 to 25:** `gender`, `multi`, `mcSkills`, `totalLevel`, `hdList` (the last three are in the copy list), `choices`, `conds`, `exh`, `conc`, `concCheck`, `death`, `rollLog`, `bgGold50`, `langs`, `toolsChosen`, `varEnc`, `xp`. On encounters: `xpAwarded`. On loot: `givenTo`.

## Sheet maths checks and rules fixes (2026-11-15)

- **The checks.** `npm run test:sheet` (`test/e2e/sheet-maths.cjs`) generates 432 sheets: both rule sets, all 12 classes, 9 levels and 2 seeds each. It checks them against rules written out independently of the app:
  - proficiency bonus, ability modifiers and the 3 to 20 score range
  - class saving throws, allowing for Gloom Stalker, Monk 14+, Rogue 15+ and Resilient
  - average HP, leaving out Tough, Boon of Fortitude, dwarves and Draconic, which is checked separately
  - skills, including expertise, Jack of All Trades and 2014 Remarkable Athlete
  - initiative (`initBonus` already includes Alert)
  - passive Perception and spell DC and attack
  - spell slots for full, half (2024 from level 1) and pact casters
  - `pcLevelTo` keeping base scores and skills
- **Bugs fixed:**
  - Removed `hpBonus: 1` from `CLASS_DATA.Sorcerer`. Draconic HP comes only from `subBonuses`.
  - `athleteBonus` and the initiative lines now round Remarkable Athlete up.
  - 2014 Jack of All Trades now adds to initiative, in the generator and in the `pcRecompute` init line.
  - 2024 half casters now get slots at level 1.
- **When you change sheet maths, run `npm run test:sheet`.**

## Spell cards (2026-11-15)

- **How it works.** `openSpellCards(c)` makes one card per prepared spell (`spellCardHTML`) in the item-card style (`ITEMCARD_CSS`), opened through `openOverlay` with a downloadable HTML file. The `data-ra="cards"` button is on My Characters.
- **The `.ds` clash.** `.icard .ds` resets the death-save dot style that shares the `.ds` class name. Before this fix, card text was squeezed into a 13 px column, in item cards too.
- **Tests:** `npm run test:cards` (`test/e2e/spell-cards.cjs`).
