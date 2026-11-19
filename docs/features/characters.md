# Characters: how a sheet is built, its fields, the sheet checks, spell cards

Code: `src/app/07e-generator.js` (generateCharacter; its tables are in `07a`–`07c`), `09-character-sheets.js`, `12-level-homebrew-feats.js` and `13a`–`13e` (My Characters). **Read this before changing sheet maths**, and run `npm run test:sheet` after.

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

## One Characters tab (2026-11-19)

The owner chose one tab over two (Characters and My Characters).
- **Page:** `#view-roster` holds the side panel (`#pcSide`: `#rosterList`, the `<details id="forgeBox">` with `#pcForm`, Import) and the main column (`.pc-main`: `#pcOut` for the step-by-step builder, `#rosterMain` for the sheet). The nav has one link, `data-view="roster"`, labelled Characters. `route()` maps `#character` (old links, news `go:`, a player's `Portal.home`) to `roster`, opening the forge form when there are no characters.
- **Drafts:** forging sets `currentPC` and `RC.id`, and `renderPC()` shows it on the shared sheet. `rosterCur()` returns the draft when selected; `pcIsDraft(c)` is true for `currentPC` while it isn't in `PCS.roster`. `draftBarHTML` (13e) shows Save (`keepPC`), Reroll (`window.pcReroll`, the forge form's `run`; not for custom builds) and Discard (`discardPC`). The sheet's Delete on a draft discards it.
- **Saving:** a draft is never sent to a campaign. Offline (or signed in without a campaign) it is kept in `PCS.cur` in the browser and survives a reload; signed in to a campaign, `pcPersist` hands off to the portal, which only syncs `PCS.roster`, so a draft is lost on reload there (as before the merge). `keepPC` puts it in `PCS.roster`. Rerolls never reach the campaign or its activity feed.
- **The address:** `route()` rewrites `#character` (and a player's landing page) to `#roster` with `history.replaceState`, because refreshes after level-up (`pcRefresh`), dialogs (`actClose`), homebrew changes and boot check `location.hash === "#roster"`.
- **Other members' sheets are made harmless on arrival (2026-11-19, security review):** `portal.js` calls `incoming(ch)` before `remember` wherever a character comes from the database (sign-in load, poll, the clash dialog's "load theirs"). For characters you don't own it runs `pcSafeText`: `<`, `>` and `"` in every string become ‹ › ”, `ed` becomes "2014" or "2024", and `pcNums` runs. The remembered copy is the cleaned one, so it matches what's on screen and no false "changed" warnings follow. Your own characters are kept exactly as typed. Many sheet templates write character strings into the page as they are, so this is the safety net; still use `esc()` in new code.
- **Keep mine:** the clash dialog's Keep mine sends `force` without a `baseVersion`. The API used to pass `NaN` to Postgres and answer 500; it now treats a missing version as -1 (force) and saves. `npm test` covers it.
- **Numbers are numbers:** `pcNums` (in `pcEnsure`) turns `level`, `scores`, `multi[].lv` and the fields in `PC_NUMS` into numbers. Other members' sheets arrive from the campaign database as any JSON, and the list and sheet write these fields into the page as they are.
- **Builder:** `renderCB` calls `pcShow("build")`; quitting, finishing, or picking a character in the list calls `pcShow("sheet")`.
- `sheetHTML` and the old `#pcOut` sheet handlers are gone. The spell window's `o.view` (rules only) is no longer used by any caller.
- Check: `npm run test:chartab`.
