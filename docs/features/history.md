# Feature history: PRs 1 to 9

The numbered list of what was built, oldest first, with the function names involved. Most of items 4 to 28 are about characters; their code is in `src/app/07a-…07e-*.js`, `12-level-homebrew-feats.js` and `13a-…13e-*.js`.

Moved here from `CLAUDE.md` on 2026-11-17, unchanged except that `public/index.html` now means the files in `src/app/` (see "How the page is built" in `CLAUDE.md`).

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

Items 15 to 28 came from **PR #5**, merged to `main` on 2026-11-15 together with PR #6 (the TV map). At that time the live Netlify site was still on the PR #3 build: Netlify had not published `main` since then.

Everything in the sections from "Dungeon Map looks" to "Tokens" below was built on branch `ccr-aa67926e-f8zxc7` on 2026-11-15, and opened as **PR #7**:
- map styles
- map import and export
- the TV extras
- shops, random encounters and spell cards
- the calendar and session recaps
- the sheet checks and tokens
- backup and restore

Everything from "Character import" to "DM setup screen" below was built in one chat on 2026-11-16 and 17, on branch `ccr-c51c8c32-xn2c0j`. It went in as **PR #9**, which the owner asked to merge to `main` on 2026-11-17 after trying it on the preview. It contains:
- character import (Companion App and PDF), homebrew spells, and pending homebrew with DM approval
- NPC pictures
- the phone and laptop layout work
- the Lore tab and MythWeaver campaign import
- imported campaigns adding their custom items and spells to Items and Homebrew
- Your NPCs on the NPC tab (with places), MythWeaver monsters in My monsters, and MythWeaver encounters in Encounters
- the World tab (nested places linked to Lore, NPCs filed by place, maps, the World builder)
- the DM setup screen: optional campaign name, Not now, rename

PR #8 (the expired sign-in fix) was merged before that chat.

15. **Collapsible toolbar and character sheet upgrade** (PR #5, branch `ccr-ee7865d5-1wx9vg`)
    - **Toolbar:** "▴ Hide tabs" collapses the header (`dmforge.hdrMini`, the `hdr-mini` class on `<html>`); the strip has a tab menu (`hdrSync`).
    - **Subclass numbers:** `subBonuses` and `pcSubNumbers`. The HP and speed bonuses are applied once, tracked by `subHp` and `subSpd`.
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
    - **Merge with `main`:** homebrew bonuses (`hbAc`, `hbSpeed`, `atkBonus`, `initBonus`) are added on top of the equipment-based AC, calculated speed, attacks and initiative.
16. **Backgrounds by rule set** (PR #5)
    - `BG_DATA["2014" | "2024"]` holds each background: skills, tools, languages, gear and gold, plus the feature (2014) or the abilities and Origin feat (2024).
    - `bgList(ed)` is a rule set's list, including homebrew. `bgInfo`, `bgSkills`, `bgLines` and `bgSummary` read it.
    - Short descriptions are in `BG_DESC` (2014) and `BG_DESC_2024`. The builder shows them on the background cards and in a details panel; the quick forge shows them in `#pcBgHint`.
    - `BACKGROUNDS` is now the union of both lists, for older lookups.
    - **2024 ability increase:** `bgAbilityBonus` gives +2/+1 to the class's best of the background's three abilities. The builder can choose instead (`custom.plus2` / `plus1`, or `custom.tri` for +1/+1/+1).
    - **Feats and features:** the generator adds the Origin feat as `{ f: "Feat: X", bgFeat: true }`, which counts in `featsTaken`, so Alert, Tough and Lucky apply. 2014 characters get `Background: X` and the feature in their feature list.
    - **Gear:** background gear goes into `kit`, and `startGold` goes into the coins when the kit is moved.
    - **Older saves:** characters saved before this get `bgV: 1` in `pcEnsure`. 2024 ones also get `bgAsiLegacy`, which keeps their old +2/+1 to the class's best scores. On opening they're rebuilt once to gain the feat or feature, then `bgV` becomes 2.
17. **Rebuilds keep the character's own choices.** Fixes an older bug where levelling up re-rolled a rolled character's scores and changed its skills.
    - The cause: the seeded random picks for species, class and background happen only when those aren't given.
    - `pcKeep(c)` passes the stored `base`, `rolls`, proficient skills (`keepSkills`), expertise in the order it was gained (`expertOrder`) and Skilled picks (`skilled`) into `generateCharacter`.
    - New expertise is chosen only when a level grants it, and is trimmed when levelling down.
18. **Gender** (PR #5)
    - The quick forge has `#pcGender` (Random/Male/Female); the builder has the `cbGender` control (`CB.gender`).
    - `generateCharacter` takes `o.gender`, or picks one with `makeRng("gender", seed)`, and names match it (`personNameG`, `fullName`, `N3_M` / `N3_F`).
    - My Characters has a Gender select (`data-rf="gender"`). It isn't in the `pcLevelTo` copy list, so a level change keeps it.
19. **Dice, conditions, concentration and death saves** (PR #5)
    - Ability checks, saves, skills, initiative and attack and damage rows are buttons (`data-roll`). `rollD20` / `rollDamage` roll them; `rollState` adds advantage, disadvantage or auto-fail from conditions, exhaustion, armor and encumbrance.
    - The bottom-right dock (`rollDockHTML`, `ROLL.mode` Normal/Adv./Dis.) shows the last 30 rolls (`c.rollLog`).
    - `rcStatusHTML` draws the condition bar (`CONDS`, stored in `c.conds`), exhaustion (`c.exh`, 0–6), concentration (`c.conc = {spell}`) and the dying box (`c.death = {s, f, stable, dead}`).
    - HP changes go through `pcDamaged` / `pcHealed`: damage at 0 HP is a death save failure, dropping to 0 knocks you out, and damage while concentrating sets `c.concCheck` (the save DC).
    - Conditions and exhaustion change speed in `pcSpeed` (the 2014 and 2024 rules differ).
20. **Casting from the sheet** (PR #5)
    - The ✦ button next to a prepared spell (`data-cast`) opens `castDialog`: slot, pact slot, ritual or free. `castGo` spends the slot and rolls.
    - **Since 2026-11-18 (spell bubbles):** the ✦ is gone. Each prepared spell is a bubble (`prepBubble`: `.prep-b[data-spell="ed|name"]`, with C/R marks), and `preparedHTML(c, true)` adds "N of M slots left" per level (`prepSlotsText`). A bubble opens `castDialog(c, ed, name, {view})`: the full rules (`.spell-rules`), then "Cast at level" buttons (`castOpts`, `[data-castlv]`, `castPick`) that set the hidden `#castSlot` and update `#castFx` (`castPreview`). `castGo` is unchanged. On the Characters tab (`view`) it's rules only. Tests: `npm run test:cast`. Design: `docs/superpowers/specs/2026-11-18-spell-bubbles-design.md`.
    - `spellPlan` reads dice, healing, upcasting, rays or darts, saves and attack rolls from the spell text. `spellTweak` handles Eldritch Blast beams and Agonizing Blast. `spellCaster` picks the right class's DC and attack.
21. **Multiclassing** (PR #5)
    - `c.multi = [{cls, lv, subclass}]` holds the extra classes; `c.cls` / `c.level` stay the first class. Use `totalLv(c)` for character level and `clsLv(c, "Class")` for one class.
    - `generateCharacter` takes `o.multi` (passed by `pcKeep`): hit points, proficiency, the multiclass spell slot table (`casterLv`, pact slots apart in `spell.pact`), features tagged `{mc}` / `{mcsub}`, and `mcSkills`.
    - `mcDialog` adds a class (checks `MC_PREREQ`); the class tags in `lvBarHTML` have − to remove a level.
    - Resources and abilities use each class's own level (`CLV`).
22. **Choices inside features and feats** (PR #5)
    - `CHOICES[feature]` describes a pick (maneuvers, invocations, metamagic, Hunter options, Pact Boon, Dragon Ancestor, Crafter, Musician and more). Picks are stored in `c.choices[feature]`; read them with `choiceOf` / `hasChoice`.
    - Magic Initiate: `miHTML` / `miSync` add the chosen spells to `c.prepared` with `src: "Magic Initiate"` (they don't count against the spell limit).
23. **Background 50 gp, proficiencies and languages** (PR #5)
    - 2024 characters can take 50 gp instead of the background's gear (`bgGold50`; `cbGold` in the builder, `#pcGold50` in the quick forge).
    - `profSecHTML` shows armor, weapons, tools and languages from `profInfo(c)`. Typed choices are saved in `c.langs` and `c.toolsChosen`.
24. **Encumbrance, buying and loot** (PR #5)
    - `pcLoad(c)` adds up item and coin weight. Over capacity, speed becomes 5 ft. 2014 sheets can turn on variant encumbrance (`c.varEnc`).
    - Items tab: "Buy" (`itBuy`) pays from the character's coins with `payCoins`, making change.
    - Campaign loot rows have a "Give to…" select (`lootGiveHTML`) that moves the item into a character's inventory.
25. **Party at a glance and XP** (PR #5)
    - The Encounters tab starts with `partyGlanceHTML`: each party member's AC, HP, passive Perception, initiative, conditions and concentration, with damage and heal buttons (through `actApply`).
    - Each encounter has "Award XP" (`data-ea="xp"`): its XP is split between the party's saved characters (`c.xp`), and `e.xpAwarded` is set.
    - `XP_LEVELS` / `xpNext` drive the "Enough XP for level N" tag in `lvBarHTML`.
26. **Monster data and phone layout** (PR #5)
    - Fixed in the 2014 data: Donkey (40 ft.), Drow (30 ft.), Deep Gnome (20 ft.), Cult Fanatic HP 33, Reef Shark 4d8+4. Other "0 ft." walking speeds (ghosts, sharks, Shrieker) are correct.
    - Under 600px wide the header is compact with one scrolling row of tabs (the active tab scrolls into view), and the roll dock hides its Normal/Adv./Dis. buttons until opened.
27. **Install as an app (PWA)** (PR #5)
    - `manifest.webmanifest`, icons in `public/icons/` (made from the header emblem) and `sw.js`.
    - The service worker fetches pages and scripts fresh when online and falls back to its saved copy offline. It never caches `/api/`, `/.netlify/` (sign-in) or other sites. Bump `CACHE` in `sw.js` if its caching rules change.
    - Browsers that offer installing show "⬇ Install app" in the header (`#installBtn`, `beforeinstallprompt`). `netlify.toml` serves `sw.js` with `no-cache`.
28. **What's new bell** (PR #5)
    - A bell in the header (`#newsBtn`, also shown on the collapsed strip) with a red count of updates this browser hasn't seen. Clicking it opens the "What's new" panel (`newsOpen`), and opening it marks everything as seen (`dmforge.newsSeen`).
    - The entries are in `NEWS`, newest first: `{ id, date, title, go, items }`. `go` adds a "Show me →" button that opens that tab.
