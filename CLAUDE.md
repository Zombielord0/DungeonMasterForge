# Dungeon Master's Forge: notes for future chats

These are project notes for the next chat (human or Claude). They cover what the app is, how it's built, what has been done, and the rules the owner has set. The user-facing guide is `README.md`.

## Ground rules from the owner

- **Don't merge or push to `main` unless the owner asks in that chat.** A push to `main` starts a Netlify production deploy, and Netlify credits have run out before ("only testing"). Work on a branch, and test locally with `npm run dev`.
- The owner is on **Windows** and can't run bash scripts. Anything they run themselves has to work in PowerShell or Command Prompt, so prefer `npm run ...` scripts.
- Explain things plainly. The owner tests in the browser rather than reading code.
- Don't open pull requests unless asked.

## What the app is

The Forge is a D&D 5e toolkit with both the 2014 and 2024 rules. It has a character generator, My Characters sheets, spells, items, a Monster Manual, a campaign tracker, homebrew and feats. Players and the DM sign in and share one campaign.

Live site: https://dungeonmasterforge.netlify.app (Netlify; production branch `main`).

## Layout

| Path | What it is |
| --- | --- |
| `public/index.html` | The whole app on one page: vanilla JS with global functions (~6,800 lines). Most feature work happens here. |
| `src/portal.js` | Sign-in, campaigns, shared characters, the Party tab, whispers, homebrew sync. esbuild bundles it into `public/portal.js`, which is gitignored and never edited by hand. |
| `netlify/functions/api.mjs` → `netlify/lib/api.mjs` | Campaign API at `/api/*`. `handle(req, user, db)` holds all the routes. `netlify/lib/diff.mjs` writes the activity feed text. |
| `netlify/database/migrations/` | Postgres tables, applied automatically on deploy: `campaigns`, `members`, `characters` (versioned jsonb), `activity`, `whispers`, `homebrew`. |
| `test/api.test.mjs` | API tests (node:test against PGlite through `@netlify/database-dev`). |
| `test/e2e/` | `server.mjs` serves the app, the API and an in-memory database on one port. `fake-identity.js` stands in for Netlify Identity locally. `walkthrough.cjs` is a Playwright walkthrough. |
| `tools/convert-srd-monsters.py` | Generated the SRD monster data for the Monster Manual. |

## Commands

```
npm install
npm test        # API tests (11 should pass)
npm run build   # bundle src/portal.js -> public/portal.js
npm run dev     # full local copy at http://localhost:8899 (any OS); stand-in sign-in, data wiped on Ctrl+C
```

Playwright and Chromium are pre-installed in cloud sessions. To test offline mode (no sign-in screen), run `localStorage.setItem('dmforge.offline','1')` in an init script.

## Saved data

- **In the browser** (also used by "Use without an account"): `dmforge.pcs.v1` (characters), `dmforge.campaigns.v1`, `dmforge.homebrew.v1`, `dmforge.items.v1`, `dmforge.mymonsters.v1`, `dmforge.favspells`, `dmforge.offline`.
- **Signed in:** characters and homebrew live in Postgres, per campaign. Homebrew is polled every 30 seconds. Every character save bumps `version`, so if two people save the same sheet at once, the second one is asked which version to keep.

## Feature history (oldest first)

1. **Player and DM portals** (PR #1)
   - Sign-in, joining a campaign with a code, and shared character sheets.
   - The DM gets a Party tab, an activity feed and whispers.
   - Players see Characters, My Characters, Spells, Feats, Items and Whispers.
2. **Monster Manual** (PR #2)
   - SRD 5.1 and 5.2 monsters, a monster builder, and companions and Wild Shape.
3. **Fix the blank page after a signed-in refresh** (PR #3)
4. **Level up button and subclass choice**
   - `lvBarHTML(c)` puts "⬆ Level up to N" and a subclass-needed warning on both sheets.
   - The `#lvModal` dialog, driven by the global `LV` state, steps through levels one at a time (`lvChain`, `lvOpen`, `lvConfirm`, `lvClose`).
5. **Ability Score Improvements**
   - At each ASI level the dialog asks for +2 to one score, +1 to two scores, or a feat.
   - The choices are stored in `c.asiPicks = {level: {str:2} | {str:1,con:1} | {feat, ab?, max}}`.
6. **Feat picker pop-out**
   - `#featModal`: `featOpen`, `featRender`, `featPick`, `FP` state.
   - Feat data is in `FEATS` (2014: the 42 PHB feats; 2024: origin, general and epic boon groups).
   - `FEAT_REPEAT` lists the feats that can be taken more than once.
7. **Typed levels**
   - Typing a higher level in the roster Level box runs the same Level up chain.
   - Typing a lower level drops later ASI picks.
   - An `if (LV.c) return` guard stops the change event from firing twice.
   - The custom builder creates the character at level 1, then calls `lvChain` up to the target level.
8. **Homebrew tab** (only the DM can edit it; the whole campaign can see it)
   - Custom subclasses, backgrounds, feats and species.
   - `HB` holds the list. `hbApply()` merges it into `BACKGROUNDS`, `PC_RACES` and `RACE_DESC`.
   - Homebrew subclasses and feats are appended in `subclassList` and `featList`.
   - Offline it saves to localStorage. Signed in, it saves through the API: GET for everyone, PUT and DELETE for the DM only (the API returns 403 to players).
   - `hbProblem` rejects names that clash with built-ins or with other homebrew.
9. **Homebrew effects change sheet numbers**
   - `HB_FX` effect types: ac, hp, hpLv, speed, init, atk, spell, ab, save, skill, exp, res, imm, vul, cimm, sadv.
   - `hbEffects(...)` collects them and `generateCharacter` applies them.
   - When a character is out of date with the homebrew, `hbStale(c)` shows an "Update sheet" notice.
10. **Damage resistances, immunities and vulnerabilities, and condition immunities, as homebrew effects**
    - Shown as tags on the sheet by `defList`, `defHTML` and `defText`.
11. **Built-in species defences**
    - `TRAIT_RES` and `traitRes` cover damage resistances, including a Dragonborn's from its ancestry.
    - `TRAIT_SADV` and `traitSadv` cover save advantages: Fey Ancestry, Brave, Dwarven or Stout Resilience, Gnome Cunning.
    - No built-in species has a condition immunity, so `TRAIT_SADV` uses save advantages instead.
    - Characters saved before this get the defences on load through `withTraitRes(c)` in `pcEnsure`.
12. **`npm run dev`**: a local copy that runs on Windows.
13. **Species features by level**
    - `RACE_LV[ed][trait] = [[level, spell|null, desc]]`. `raceLevelFeats` adds them as the character levels, tagged "(Species, lv N)".
    - Older saves are upgraded by `raceLvUpgrade(c)`.
14. **Feats tab** (`#view-feats`, for DMs and players)
    - Browse the feats and add one to a character with `ftAdd` / `ftTargets`; it's stored in `c.bonusFeats = [{n, l, a, max}]`.
    - The sheet has a Feats section (`featsSecHTML`) with Add and Remove.
    - `pcRebuild(c)` regenerates the sheet and keeps current HP.

Items 4 to 14 were merged to `main` on 2026-11-14 (commit `5d44a7b`).

15. **Collapsible toolbar and character sheet upgrade** (PR #5, branch `ccr-ee7865d5-1wx9vg`)
    - **Toolbar:** "▴ Hide tabs" collapses the header (`dmforge.hdrMini`, the `hdr-mini` class on `<html>`); the strip has a tab menu (`hdrSync`).
    - **Backgrounds:** `BG_DESC` descriptions in the builder and the quick forge.
    - **Equipment:** `pcInvUpgrade` moves the starting kit into `c.inv` once (`c.kitMoved`). Inventory items have `eq`.
      - `pcAttacks` builds the attack list from equipped weapons (`eqWeaponOf`, `eqAttack`, `eqProficient`).
      - `pcAC` / `pcACApply` work out AC from armor, shields, protective items (`PROT_ITEMS`), the Defense style and spell toggles (`c.fx`).
      - `pcSpeed` / `pcSpeedApply` work out speed. A typed AC or speed is kept (`acManual` / `speedManual`).
    - **Features:** `FEAT_FULL` holds the full class feature text, opened with `<details>` in `featLi`.
      - `SUB_FEATS["ed|Subclass"]` lists subclass features; `pcSubSync` keeps them on saved sheets.
      - `subBonuses` applies subclass numbers: Draconic HP and AC, Champion crit range, Remarkable Athlete, Gloom Stalker initiative and save.
    - **Abilities:** `pcAbilities` lists what you use in play; `pcResources` and `c.used` drive the − / + counters; `pcRest` handles rests.
      - `ACT[name]` holds activations: `toggle` (stored in `c.active`, effects merged by `pcFx`), `persist` (a standing choice), `instant` (Use).
      - Results go through `actResultDialog`, area effects through `actAoeDialog` (separate or shared rolls; `foeSaveBonus` reads monster saves).
      - Wild Shape picks a beast with `wildBeasts` / `beastForm`; the 2014 beast HP is `c.formHp`.
      - The short rest dialog spends hit dice (`shortRestDialog`). `recoveryDialog` handles Arcane and Natural Recovery.
    - **Fighting styles** live in `c.fightStyles`. Armor training comes from `armorTraining`.
16. **Backgrounds by rule set** (PR #5)
    - `BG_DATA["2014" | "2024"]` holds each background: skills, tools, languages, gear and gold, plus the feature (2014) or the abilities and Origin feat (2024).
    - `bgList(ed)` is a rule set's list, including homebrew. `bgInfo`, `bgSkills`, `bgLines` and `bgSummary` read it.
    - `BACKGROUNDS` is now the union of both lists, for older lookups.
    - **2024 ability increase:** `bgAbilityBonus` gives +2/+1 to the class's best of the background's three abilities. The builder can choose instead (`custom.plus2` / `plus1`, or `custom.tri` for +1/+1/+1).
    - **Feats and features:** the generator adds the Origin feat as `{ f: "Feat: X", bgFeat: true }`, which counts in `featsTaken`, so Alert, Tough and Lucky apply. 2014 characters get `Background: X` and the feature in their feature list.
    - **Gear:** background gear goes into `kit`, and `startGold` goes into the coins when the kit is moved.
    - **Older saves:** characters saved before this get `bgV: 1` in `pcEnsure`. 2024 ones also get `bgAsiLegacy`, which keeps their old +2/+1 to the class's best scores. On opening they're rebuilt once to gain the feat or feature, then `bgV` becomes 2.
17. **Rebuilds keep the character's own choices.** Fixes an older bug where levelling up re-rolled a rolled character's scores and changed its skills.
    - The cause: the seeded random picks for species, class and background happen only when those aren't given.
    - `pcKeep(c)` passes the stored `base`, `rolls`, proficient skills (`keepSkills`), expertise in the order it was gained (`expertOrder`) and Skilled picks (`skilled`) into `generateCharacter`.
    - New expertise is chosen only when a level grants it, and is trimmed when levelling down.

## How a character is built (read this before changing sheet maths)

- `generateCharacter(o)` builds the whole sheet from options with a seeded RNG (`makeRng`), so the same inputs give the same sheet.
- Level changes never patch numbers directly. They go through `pcLevelTo(c, lv)`, which regenerates the character with `subclass`, `asiPicks` and `bonusFeats` and copies the derived fields back (level, scores, mods, saves, skills, hp, ac, attacks, spell, feats, traits, res/imm/vul/cimm/sadv, hbSig and so on).
- If you add a derived field to the character, add it to the copy list in `pcLevelTo`, or levelling up will drop it.
- Order inside the generator:
  1. Pick the subclass, before rolling scores.
  2. Apply ASI picks, bonus feats and homebrew ability bonuses.
  3. Skills and expertise.
  4. HP. Tough gives +2 per level; Boon of Fortitude gives +40.
  5. Saves.
  6. AC.
  7. Attack and initiative bonuses. Alert adds proficiency in 2024 and +5 in 2014.
  8. Spell bonus.
  9. Speed.
  10. Defences.
- Loading an older save goes through `pcEnsure`, which runs migrations such as `withTraitRes` and `raceLvUpgrade`. New data fields need a migration there too.

## Character fields worth knowing

`subclass`, `asiPicks`, `bonusFeats`, `res`, `imm`, `vul`, `cimm`, `sadv`, `hbSig` (homebrew signature used to detect stale sheets), `initBonus`, `atkBonus`, `spell.bonus`, `raceLv`, `hpCur`.

From PR #5:
- **Derived**, so they're in the `pcLevelTo` copy list:
  - `hbAc` and `hbSpeed`: the homebrew AC and speed bonuses, kept apart so equipment AC and calculated speed can add them.
  - `subHp` and `subSpd`: subclass bonuses already applied.
- **Stored on the sheet:** `inv[].eq`, `kitMoved`, `used`, `active`, `fx`, `fightStyles`, `acManual`, `speedManual`, `formHp`.
- **Backgrounds:** `bgV`, `bgAsiLegacy`, `startGold` / `goldAdded`, `skilled`, `expertOrder`. `skilled` and `expertOrder` are also in the `pcLevelTo` copy list.

## Gotchas found along the way

- Segmented radio inputs are hidden. In Playwright, click `label.opt:has(input[...])`.
- Once `portal.js` is built, the sign-in gate covers the page. Set `dmforge.offline` to `1` for offline tests.
- Resilient is **not** repeatable.
- Homebrew row inputs need their font reset (`.hb-row input`), because otherwise they inherit the uppercase label style.
- Tag wording: "Condition immunities", "Advantage on: saves vs frightened, WIS saves", and "immune to exhaustion" rather than "can't be exhaustion".
- On My Characters, `renderRosterMain` runs `pcInvUpgrade`, `pcSubSync`, `pcSubNumbers` and then `pcRecompute`. `pcRecompute` rebuilds attacks, AC and speed from equipment and active effects, so don't set `c.ac`, `c.speed` or `c.attacks` directly there.
- `pcFx` calls `pcAbilities`. Never call `pcAC` from inside an `ACT` effect, or they'll loop forever; use `wearingArmor(c)` instead.
- The 2014 Donkey in the monster data has a speed of "0 ft.", which is wrong in the data.
