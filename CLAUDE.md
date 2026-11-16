# Dungeon Master's Forge: notes for future chats

These are project notes for the next chat (human or Claude). They cover what the app is, how it's built, what has been done, and the rules the owner has set. The user-facing guide is `README.md`.

## Ground rules from the owner

- **When a change ships, add an entry to the top of `NEWS` in `public/index.html`** with a new `id`, in plain words for players and DMs. That's what lights up the bell for everyone.

- **Don't merge or push to `main` unless the owner asks in that chat.** A push to `main` starts a Netlify production deploy, and Netlify credits have run out before ("only testing"). Work on a branch, and test locally with `npm run dev`.
- The owner is on **Windows** and can't run bash scripts. Anything they run themselves has to work in PowerShell or Command Prompt, so prefer `npm run ...` scripts.
- Explain things plainly. The owner tests in the browser rather than reading code.
- Don't open pull requests unless asked.
- Pushing to a pull request's branch starts a Netlify **deploy preview**, which also uses build credits. Push when the work is ready or when asked, rather than after every small change. Cloud sessions have a stop hook that asks for unpushed commits to be pushed.
- **Test on preview pages, not the live site (owner, 2026-11-16).**
  - Work goes on a branch with a **draft** pull request into `main`, so Netlify builds a deploy preview the owner can try in the browser (`deploy-preview-<PR number>--dungeonmasterforge.netlify.app`).
  - Run the automated checks locally first, and push in batches: one preview build per finished piece of work.
  - Merge to `main` (a production build) only when the owner has tried the preview and asks.
  - Previews may use their own copy of the campaign database, so test there with fresh accounts and campaigns.

## What the app is

The Forge is a D&D 5e toolkit with both the 2014 and 2024 rules. It has a character generator, My Characters sheets, spells, items, a Monster Manual, a campaign tracker, homebrew and feats. Players and the DM sign in and share one campaign.

Live site: https://dungeonmasterforge.netlify.app (Netlify; production branch `main`).

## Layout

| Path | What it is |
| --- | --- |
| `public/index.html` | The whole app on one page: vanilla JS with global functions (~10,300 lines). Most feature work happens here. |
| `src/portal.js` | Sign-in, campaigns, shared characters, the Party tab, whispers, homebrew sync. esbuild bundles it into `public/portal.js`, which is gitignored and never edited by hand. |
| `netlify/functions/api.mjs` → `netlify/lib/api.mjs` | Campaign API at `/api/*`. `handle(req, user, db)` holds all the routes. `netlify/lib/diff.mjs` writes the activity feed text. |
| `netlify/database/migrations/` | Postgres tables, applied automatically on deploy: `campaigns`, `members`, `characters` (versioned jsonb), `activity`, `whispers`, `homebrew`. |
| `test/api.test.mjs` | API tests (node:test against PGlite through `@netlify/database-dev`). |
| `test/e2e/` | `server.mjs` serves the app, the API and an in-memory database on one port. `fake-identity.js` stands in for Netlify Identity locally. `walkthrough.cjs` is a Playwright walkthrough. |
| `tools/convert-srd-monsters.py` | Generated the SRD monster data for the Monster Manual. Its `FIXES` list corrects mistakes in the SRD source. |
| `public/manifest.webmanifest`, `public/sw.js`, `public/icons/` | Install as an app (PWA). See item 27. |
| `public/player.html` | The TV player screen. It shows only the pictures the DM's window sends. |
| `test/e2e/*.cjs` | Self-contained Playwright checks for each feature (`npm run test:…`). Each starts its own static server and needs no database. |
| `docs/superpowers/` | The design and plan for the Dungeon Map upgrade. |

## Commands

```
npm install
npm test        # API tests (12 should pass)
npm run build   # bundle src/portal.js -> public/portal.js
npm run test:backup  # backup and restore checks (Playwright, any OS)
npm run test:tv  # turn order + handouts on the TV (Playwright, any OS)
npm run test:mapvis  # map styles, furniture, caves, hover, zoom (Playwright, any OS)
npm run test:mapio  # map import/export: pictures, VTT files, map files, Foundry/Roll20 (Playwright, any OS)
npm run test:shop  # shop generator (Playwright, any OS)
npm run test:random  # random encounters (Playwright, any OS)
npm run test:cards  # printable spell cards (Playwright, any OS)
npm run test:mapenc  # map room -> encounter (Playwright, any OS)
npm run test:calendar  # calendar and weather (Playwright, any OS)
npm run test:recap  # session recaps (Playwright, any OS)
npm run test:sheet  # character sheet maths vs the rules, 432 sheets (Playwright, any OS)
npm run test:tokens  # tokens on the TV map (Playwright, any OS)
npm run test:import  # character import: Companion App files and the Import window (Playwright, any OS)
npm run test:hbspell  # homebrew spells (Playwright, any OS)
npm run test:hbpend  # pending homebrew and the DM's approval queue (Playwright, any OS)
npm run test:npcpic  # NPC pictures: upload, link, TV without distortion (Playwright, any OS)
npm run test:map  # map fog + TV player screen checks (Playwright, any OS)
npm run dev     # full local copy at http://localhost:8899 (any OS); stand-in sign-in, data wiped on Ctrl+C
```

Playwright and Chromium are pre-installed in cloud sessions. To test offline mode (no sign-in screen), run `localStorage.setItem('dmforge.offline','1')` in an init script.

## Saved data

- **In the browser** (also used by "Use without an account"):
  - `dmforge.pcs.v1` (characters), `dmforge.campaigns.v1`, `dmforge.homebrew.v1`, `dmforge.items.v1`, `dmforge.mymonsters.v1`, `dmforge.favspells` and `dmforge.offline`.
  - `dmforge.fog.v1`: map fog, found secret doors and tokens for the 40 most recent maps.
  - `dmforge.lastBackup`.
  - **Imported map pictures** are in IndexedDB (database `dmforge-maps`), not localStorage.
  - The 💾 Backup file covers the keys in `BACKUP_KEYS`, but not the pictures.
- **Campaign fields added on 2026-11-15** (saved with the campaign, signed in or not):
  - `cal`, the calendar.
  - `recapAt` and `recapDay`.
  - Encounters: `kind` ("random" or "map"), `room` and `recapped`.
  - Quests: `recappedAs`. Loot and chapters: `recapped`.
  - Map entries: `style`, `fog`, `found` and `tokens`, plus `kind:"image"` records for imported maps.
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

Items 15 to 28 came from **PR #5**, merged to `main` on 2026-11-15 together with PR #6 (the TV map). At that time the live Netlify site was still on the PR #3 build: Netlify had not published `main` since then.

Everything in the sections from "Dungeon Map looks" to "Tokens" below was built on branch `ccr-aa67926e-f8zxc7` on 2026-11-15, and opened as **PR #7**:
- map styles
- map import and export
- the TV extras
- shops, random encounters and spell cards
- the calendar and session recaps
- the sheet checks and tokens
- backup and restore

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

## Dungeon Map: player screen and fog (PR #6, 2026-11-15)

- **Design and plan.** The design for the whole map upgrade is in `docs/superpowers/specs/2026-11-15-dungeon-map-upgrade-design.md`. Phase 3, the player screen, was built first, following `docs/superpowers/plans/2026-11-15-player-screen-fog.md`. Phase 1 (visuals) and Phase 2 (import/export) are done; see the sections below.
- **Fog.** A `Uint8Array` with one byte per map square (1 means players can see it).
  - Helpers: `fogKey`, `fogNew` (reveals the entrance), `fogEncode`/`fogDecode` (run-length encoded), `fogRevealRoom`, `fogPaint`, `fogBox`.
  - `fogRevealRoom` adds a 1-square ring around a room, so its walls show. A corridor reveal only uncovers the rock beside the corridor, not the rooms it leads to.
- **Drawing.** `drawDungeon(cv, d, showGrid, o)`:
  - With `o.player`: no traps, no "down" stairs, no seed or party level, the boss number in the normal colour, and unfound secret doors drawn as wall.
  - `o.fog` draws solid fog for players and a 50% tint for the DM.
  - `o.found` is a Set of `"x,y"` for secret doors the players have found. `o.numbers` turns room numbers on or off. `o.scale` overrides the pixel ratio.
  - With no `o`, it draws exactly as before.
- **The TV window.** `public/player.html` has no map data. It receives finished PNG pictures only.
  - Messages from the DM on `BroadcastChannel("dmforge.map")`: `{t:"frame",blob}`, `{t:"ping",x,y}` (fractions from 0 to 1) and `{t:"bye"}`.
  - Messages from the TV on `"dmforge.map.tv"`: `{t:"hello"}` and `{t:"bye"}`.
  - **Never send the TV map data or room key text.**
- **DM side.**
  - State is in `HOST`; the functions are `hostStart`/`hostStop`/`hostSend` (debounced)/`hostPing`/`hostLoad`, and `drawMapDM()` redraws the DM canvas.
  - Fog tools live in `#fogTools`, which is disabled until hosting starts.
  - While hosting, `fogKeyButtons()` adds a "Reveal on TV" / "Hide on TV" button (`data-fogroom`) to each Room Key entry. This is the keyboard-friendly Room tool.
  - Undo snapshots are `{f: fog copy, s: found Set}`, so Undo also reverses secret-door clicks.
  - On the DM canvas, a found secret door's "S" turns green.
- **Saving fog.**
  - Fog autosaves to localStorage `dmforge.fog.v1`, keyed by `fogKey`, keeping the 40 most recent maps.
  - `#mapSave` adds `fog` and `found` to the campaign's map entry. `mapOpenSaved(m)` restores them.
  - Nothing touches Netlify during play.
- **Turn order and handouts on the TV.**
  - `hostFrameCanvas()` builds each TV picture:
    - With `HOST.show === "handout"`, it's the handout canvas.
    - Otherwise it's the player map with a turn-order bar (`tvDrawInitStrip`) when `HOST.enc = {cid, eid}` is set.
    - With a fight but no map, it's a large list (`tvInitBoard`). With nothing at all, it's a dark screen.
  - `tvInitRows(c, e)` is all the TV may know about a fight: `{name, foe, cur, state}`, where state is "", "Bloodied" or "Down". **Never add HP numbers.**
  - The encounter card's `data-ea="tv"` button toggles `HOST.enc` and starts hosting if needed. `rerenderEnc` re-sends the picture while that fight is on the TV.
  - Handouts: `handoutPicture(file)` scales a picture to at most 2560px; `handoutWriting(title, text)` draws parchment sized to the text. Both go through `handoutShow`, and `#handoutBack` returns to the map. Pings are ignored while a handout is showing. Handouts aren't saved.
  - Tests: `npm run test:tv` (`test/e2e/tv.cjs`).
- **Tests.** Run `npm run test:map` (`test/e2e/map-fog.cjs`). It starts its own static server and needs no database. It waits on `window.tvFrames`, because encoding the PNG is slow in the headless browser.

## Dungeon Map looks (Stage 1, 2026-11-15)

- **Layouts don't change.** `generateDungeon` is untouched. All the new drawing uses its own seeded streams (`makeRng("dress"|"tex"|"ink"|"noise"|"grain", seed, …)`). `npm run test:mapvis` compares the layouts of 18 seed and theme pairs against fingerprints taken before this work.
- **Styles.** `d.params.style` is `parchment`, `blue` or `dark` (`MAP_STYLES`), set from `#mapStyle` and saved with campaign maps. A missing style means parchment.
  - Theme colours are in `MAP_BG` and `MAP_FLOOR[theme][parchment, dark]`.
- **Drawing order.**
  - `mapBase(d, showGrid, player, found, scale)` draws the grid area and caches it on `d._base`, keeping at most 7 versions. It draws, in order:
    1. Rock and hatching.
    2. The floor layer (`mapTexture` for each theme), masked to the dungeon's shape.
    3. Walls.
    4. Doors (`mapDrawDoors`).
    5. Furniture.
    6. Paper grain and the edge shading.
    7. Icons (`mapDrawIcons`).
  - `drawDungeon` then adds room numbers, fog, the header and the legend on top.
- **Caves.** The floor squares are blurred (`ctx.filter`), and the alpha is thresholded with `mapNoise` into an inner mask (the floor) and an outer mask (the wall ink). When this runs, `d._caveSmooth` is set. Browsers without `ctx.filter` get square walls.
- **Furniture.** `mapDress(d)` is deterministic and cached on `d._dress`. It picks pieces by room name (`DRESS_BY_NAME`), falling back to the theme (`DRESS_BY_THEME`). `drawProp` draws each piece.
  - Furniture never covers the 3×3 around the room number, icons, or doorway squares. In caves it only goes on squares surrounded by floor.
- **Reading the map.**
  - `MAPUI = {zoom, hover, pan}`, with zoom steps `MAP_ZOOMS`.
  - `drawMapDM` draws at the shown size, so zooming stays sharp.
  - `#mapOverlay` holds the hover outline (`mapOverlayDraw`); `mapSetHover` keeps the map and the key in sync.
  - When not hosting, clicking a room scrolls to its key entry and dragging pans. While hosting, the mouse paints fog instead.
- **Downloads.** Download PNG and Download player map render fresh at 2× (`mapFileName()`); the player map uses `{player:true, numbers:true}`.

## Dungeon Map import and export (Stage 2, 2026-11-15)

- **Imported maps** are `{kind:"image", id, img (canvas), px, ox, oy, W, H, rooms, walls, params}`. Here `px` is the image's pixels per square and `walls` are segments in squares. `drawDungeon` hands them to `drawImageMap`.
  - The rooms are numbered markers (`imgRoom`): `cx`/`cy`, `name`, `notes`, `content`, `enc`.
  - `imgRegrid` recomputes `W`/`H` from `px` and the offsets, and drops markers that fall off the grid.
- **Pictures** are kept on this computer in IndexedDB (`MAPIMG`, database "dmforge-maps", store "images"), capped at 4096 px (`loadImageCanvas`).
  - Campaigns store only `imgRecord(d)`, with no picture.
  - `imgOpenSaved` says so if the picture isn't on this device.
  - Backups don't include pictures; map files do.
- **Fog** on imported maps is keyed `img|id|WxH`, so changing the grid starts fresh fog.
  - `fogNew` starts fully hidden.
  - `fogRevealRoom` hands off to `fogRevealArea`: a flood fill blocked by walls (from VTT files, with doors counting as walls), capped at 900 squares; with no walls, a circle of radius about 3.
- **The panel** is `#impPanel`: name, theme for rolled rooms, Squares across (`#impAcross`), the nudge sliders (`#impOffX`/`#impOffY`), and Place rooms (`#impPlace`).
  - Placing uses `imgDown`/`imgMove`/`imgUp` through `MAPUI.drag`.
  - The key comes from `imageKeyHTML`, with `data-imf` fields and `data-ima` roll/delete buttons. `rollRoomContents` copies the generator's rules for ordinary rooms.
- **Files.**
  - **Map files:** `{app:"dmforge-map", v:1, map, image?}`. For a generated map, `map` holds its params plus fog. For an imported one, it's `imgRecord`, fog and the picture as a data URL.
  - **Universal VTT import** (`#mapImportVtt`) reads `resolution`, `line_of_sight`, `objects_line_of_sight`, `portals` and `image`.
  - **VTT export** (`#mapExportVtt`) writes `.dd2vtt`:
    - The picture comes from `mapVttPicture` at 100 px per square; it's the players' version.
    - Walls come from `mapVttWalls`, with runs merged and unfound secret doors written as walls.
    - Doors become portals (`mapDoorEdge`).
  - **Roll20** (`#mapExportRoll20`) is a 70 px per square PNG.
- **Tests:** `npm run test:mapio` (`test/e2e/map-import.cjs`).

## Shops (2026-11-15)

- **Making a shop.** `shopMake({type, size, level, seed, ed})` builds a shop from `IT.data`, and the same seed always gives the same shop. It returns `{name, label, keeper, mood, stock}`, with each stock item as `{id, n, cat, g, kind, rk, gp, c, qty}`.
  - **Shop kinds** are in `SHOPS` (`general`, `smith`, `bowyer`, `alchemist`, `magic`, `temple`). Each has a `gear` filter, a `magic` filter, and stock counts for village, town and city.
  - **Magic rarity** is capped by settlement and level: villages sell up to uncommon; towns up to rare from level 5; cities up to very rare from level 11.
  - **Prices:** the shopkeeper's manner (`SHOP_MOODS`) scales them, and `shopNiceGp` rounds them.
- **On the page.** `#itShopBtn` opens it in `#itShop` on the Items tab, through `shopNew` and `shopRender`. The shop is held in `IT.shop` and isn't saved.
  - Buy calls the existing `itBuy` with the shop's price, and lowers `qty` only if the coins actually changed.
- **Tests:** `npm run test:shop` (`test/e2e/shop.cjs`).

## Random encounters (2026-11-15)

- **Building a fight.** `randomEncounter(rng, env, level, party, diff)` picks monsters from the 2014 Monster Manual data (`randMonsters()`, which reads `#monsterData`), filtered by their `env` tags. It sizes the group against `partyThr` with the usual `mult` multiplier, capped at 1.5× the target. It returns `{groups, hook}`.
  - When nothing fits, it falls back to the weakest monster that lives there.
- **On the page.** `randHTML()` draws the controls at the top of the Encounters tab: `#randEnv`, `#randDiff` and `#randRoll`, with the current choices kept in `RAND`.
  - `randRoll(c)` creates the encounter with `kind:"random"` and the hook in its notes, and takes AC and HP from the Monster Manual.
- **Places** are listed in `RAND_ENVS`; the hooks in `RAND_HOOKS`.
- **Tests:** `npm run test:random` (`test/e2e/random-enc.cjs`).

## Spell cards (2026-11-15)

- **How it works.** `openSpellCards(c)` makes one card per prepared spell (`spellCardHTML`) in the item-card style (`ITEMCARD_CSS`), opened through `openOverlay` with a downloadable HTML file. The `data-ra="cards"` button is on My Characters.
- **The `.ds` clash.** `.icard .ds` resets the death-save dot style that shares the `.ds` class name. Before this fix, card text was squeezed into a 13 px column, in item cards too.
- **Tests:** `npm run test:cards` (`test/e2e/spell-cards.cjs`).

## Map rooms to encounters (2026-11-15)

- **The button.** `roomKeyHTML` and `imageKeyHTML` add `mapRunBtn(i)` under any room with an `enc`.
- **What it does.** `mapRunEncounter(i)` parses `o.enc.text` with `parseEncText` and adds a `kind:"map"` encounter to the campaign picked in `#mapCampaign` (`curCampForMap()`).
  - While hosting, it also reveals the room (with an undo snapshot) and sets `HOST.enc` so the turn order shows on the TV.
- **Tests:** `npm run test:mapenc` (`test/e2e/map-enc.cjs`).

## Calendar and weather (2026-11-15)

- **Data.** `c.cal = {day, min, climate, season, weather, log}`. `calEnsure(c)` creates it, `calAdvance(c, minutes, note)` moves the clock and rolls each new day's weather, and `calLog` keeps the 200 most recent entries.
- **Weather.** `calWeather(seed, day, climate, season)` follows the usual d20 tables for temperature, wind and precipitation, seeded by campaign and day. It returns `{day, f, sky, text, effects}`.
  - `effects` holds the rules text for strong wind, heavy rain or snow, extreme cold and extreme heat.
  - Climates are in `CAL_CLIMATES`; the season changes every 91 days (`calSeason`).
- **On the page.** The Campaign Tracker has a "Calendar" sub-tab (`calHTML`), with `data-cal` buttons and the `#calClimate`, `#calSeason` and `#calDay` fields.
- **Tests:** `npm run test:calendar` (`test/e2e/calendar.cjs`).

## Session recaps (2026-11-15)

- **What goes in.** `recapMake(c)` collects everything since `c.recapAt`, and returns `{text, empty, mark()}`:
  - fights with status Done or with XP awarded, unless they have `e.recapped`
  - quests that are Completed or Failed, unless `q.recappedAs` already matches their status
  - chapters that are done, unless they have `ch.recapped`
  - loot with `givenTo`, unless it has `l.recapped`
  - calendar log entries newer than `c.recapAt`
- **Marking.** `mark()` sets those flags plus `c.recapAt` and `c.recapDay`, so the next recap only has what's new.
- **On the page.** `recapWrite(c)` adds `{title:"Session N", num, date, summary}` to `c.sessions` (newest first). `recapBarHTML()` adds the `#recapBtn` bar to the top of the Sessions tab.
- **Tests:** `npm run test:recap` (`test/e2e/recap.cjs`).

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

## Tokens on the TV map (2026-11-15)

- **Data.** `HOST.tokens` holds `[{id, name, kind: "pc"|"foe"|"npc", x, y}]`.
  - Locally they're saved in the fog store (the `k` field, through `fogStorePut(key, fog, found, tokens)`). Campaign map entries carry `tokens` too.
  - `hostLoad` restores them for the map.
- **Drawing.** `drawDungeon` and `drawImageMap` call `mapDrawTokens(g, o.tokens)` before the fog, so tokens in fogged squares are hidden from players.
  - `tokenView()` adds `state` ("Bloodied"/"Down") for monsters, taken from the fight on the TV (`hostEnc`) by name. **No HP numbers.**
- **Adding and moving.** `tokAdd(name, kind, room)` places a token on the nearest free floor square (`tokFree`).
  - `#tokParty` takes the party from the campaign picked in `#mapCampaign`, or from My Characters.
  - `#tokFight` takes the monsters of the fight on the TV, placed in its map room (`e.room`, set by `mapRunEncounter`).
  - The Tokens fog tool (`value="token"`) drags them through `HOST.tokDrag`. `#tokList` lists them with remove buttons.
- **Tests:** `npm run test:tokens` (`test/e2e/tokens.cjs`).

## Backup and restore (2026-11-15)

- **💾 Backup** (`#backupBtn`, beside the storage badge) appears only in browser-only mode; `setBadge` hides it when `Store.mode === "db"`. It opens `#backupModal`.
- **The file format:** `{app:"dmforge-backup", v:1, made, data:{key: raw localStorage string}}`, holding the keys in `BACKUP_KEYS`.
  - **When you add a new kind of saved data, add its key to `BACKUP_KEYS`.**
  - Settings are left out on purpose: offline mode, the header, What's new, and the portal's keys.
- **Functions:** `backupMake`, `backupSummary`, `backupInfo`, `backupOpen`/`backupClose` and `backupRestore(file)`.
  - Restoring checks the `app` marker, asks with `confirmBox`, writes every key in `BACKUP_KEYS` (removing ones the backup doesn't have) and reloads.
  - The last download time is kept in `dmforge.lastBackup`.
- **Downloads:** `saveFile` now falls back to a normal browser download (Blob and `<a download>`) when the Claude `downloads` helper isn't there. Before this, Download PNG and Export JSON did nothing on the website.
- **Tests:** `npm run test:backup` (`test/e2e/backup.cjs`).

## Character import (2026-11-16)

- **Design and plan:** `docs/superpowers/specs/2026-11-16-companion-import-design.md` and `docs/superpowers/plans/2026-11-16-character-import.md`.
- **Readers make a Draft:** `{src, opts, final, extras, homebrew, report:{matched, made, differ, dropped}, appSaves?}`.
  - `compImport(json, ed)` reads the 5e Companion App's export (JSON, `jsonType:"character"`). Its `allRequiredClasses.jobs`, `requiredRace` and `requiredBackground` are JSON strings holding the full rules text.
  - Unknown classes refuse the import. An unknown subclass, species, background, feat or spell becomes a homebrew entry (`src: "5e Companion App"`), unless a homebrew entry with that name already exists (`impHave`).
  - Gear goes through `impGear` (counts like "20 Arrows", `eqGear` with extra tries). If the app marks nothing as equipped, weapons and armor start equipped.
  - `opts` always has `bonus: "fixed"`, so a level-up keeps the species bonus (`pcLevelTo` defaults to "flex").
- **`importBuild(draft)`** applies the draft's homebrew as pending for the build only, then solves the base scores so the final scores equal `final` (they can go below 3). It returns `{c, report}` without saving. Imported characters have `kitMoved`, `goldAdded` and `importedFrom: {app, at}`.
- **`importCommit(draft, c)`:** a signed-in player (`impPlayer()`) gets `c.hbPending` and nothing goes to the campaign. Otherwise each entry goes through `hbPut`.
- **The window** is `#impCharModal`, opened by `#impCharBtn` on My Characters: rules choice `impEd`, `#impCharFile`, summary `#impCharOut` (`impSummaryHTML`), and `#impCharGo`/`#impCharCancel`. `impCharRead` picks the reader by content: `%PDF-` goes to `pdfImport`.
- **Homebrew spells:** `kind: "spell"` (also in the API's `HOMEBREW_KINDS`) with `l, s, c, t, r, cp, m, du, co, ri, h` and `desc`. `hbSpellsApply()` appends them to `SP.data` (`hb: true`) after the built-ins; `spPrep` is the shared per-spell setup. Homebrew text limits are 4000 characters.
- **Pending homebrew:**
  - It's stored on the character as `c.hbPending`. `hbPendSync()` (run from `renderRoster`) gathers it into `HB.pend`, each with `pend: true` and `from: [{id, name}]`.
  - `hbAny(kind)` is used wherever a character is built. `hbOf(kind)` and every picker (`raceList`, `bgList`, `subclassList`, `featList` and the spell lists) leave pending out.
  - `pendKey(x)` = `kind|cls|name`. The DM's queue is `hbPendHTML()` (`#hbPendBox`, rows `data-pendrow`, buttons `data-pendact`); `hbApprove` and `hbReject` act on it.
  - Rejecting a subclass, feat or spell takes it off the character. A species or background stays, with `rejected: true`, and the sheet shows `hbRejectedHTML`.
  - Party cards show "N homebrew to approve".
- **PDF sheets:**
  - `pdfFields(buf)` loads pdf.js on demand from `public/vendor/pdfjs/` (legacy build of `pdfjs-dist` 6.5.438, Apache-2.0, unchanged; `netlify.toml` serves its `.mjs` as JavaScript). It reads each page's widgets with `getAnnotations()`; `getFieldObjects()` came back empty in this version. It returns `{fields:{name: value}, pos:{name:{page, x, y, x2, y2}}}`, and checked boxes read "Yes".
  - `pdfImport(F, ed)` maps the official sheet's field names, ignoring spaces and case (`Race `, `DEXmod `):
    - Check Box 11/18–22 are the saves; 23–40 are the skills in alphabetical order.
    - Expertise is inferred from a skill's number.
    - A spell line's level comes from its position: the nearest `SlotsTotal 19…27` header above it in the same column (`pdfSpellLevel`).
    - The subrace is guessed from the trait names in Features and Traits.
    - Unknown names become name-only homebrew.
    - `D.check` holds HP, AC, speed and spell DC, which `importBuild` compares after `pcRecompute`.
  - `spellMatch` is lenient. It ignores text in brackets and compares letters only, then tries a prefix (6+ letters), then an edit distance of 2. It also tries again without a leading wizard's name ("Tensers Floating Disc" → Floating Disk).
- **Tests:** `npm run test:import` (`test/e2e/char-import.cjs` plus `char-import-ui.cjs` and `char-import-pdf.cjs`), `npm run test:hbspell` and `npm run test:hbpend`.
  - The fixtures are `test/e2e/fixtures/companion-zook.json` and `sheet-wizard.pdf`. The PDF is made by `python tools/make-test-sheet.py` (needs pypdf) with the official sheet's names and spell positions.
  - Players' own PDFs aren't committed.

## NPC pictures (2026-11-16)

- **Data.** A Tracker NPC can have `img` (a key `npc-<npc id>` in the `MAPIMG` IndexedDB, the same store as imported map pictures) or `imgUrl` (https only, checked by `npcUrlOk`). Setting one removes the other. Uploads are shrunk to `NPC_PIC_MAX` (2048 px).
- **Functions.** `npcPicHTML(it)` draws the frame inside the NPC list item (`.npc-row`, `.npc-body`); `npcPicFill()` loads stored pictures into object URLs, or says "Picture not on this device". The buttons are `data-npcpic="add|link|tv|clear"` and the hidden file input is `#npcPicFile`. `npcPicSet`, `npcPicLink`, `npcPicClear` and `npcPicTV` do the work. `MAPIMG.del` was added, and deleting an NPC deletes its stored picture.
- **On the TV** it's a handout (`handoutShow`), started with `hostStart` if needed. Only the picture is sent. The player screen already letterboxes every picture (`Math.min` scale), so nothing is stretched; the frame uses `object-fit: contain`.
- Pictures aren't in backups (like map pictures). A link from a site without CORS can be shown in the frame but can't be sent to the TV; the toast says to upload it instead.
- **Tests:** `npm run test:npcpic` (`test/e2e/npc-pictures.cjs`).
- **Campaign saves are written 600 ms after a change** (`Store.save`). Tests that reload must wait for that first.

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

## Gotchas found along the way

- Segmented radio inputs are hidden. In Playwright, click `label.opt:has(input[...])`.
- Once `portal.js` is built, the sign-in gate covers the page. Set `dmforge.offline` to `1` for offline tests.
- Resilient is **not** repeatable.
- Homebrew row inputs need their font reset (`.hb-row input`), because otherwise they inherit the uppercase label style.
- Tag wording: "Condition immunities", "Advantage on: saves vs frightened, WIS saves", and "immune to exhaustion" rather than "can't be exhaustion".
- On My Characters, `renderRosterMain` runs `pcInvUpgrade`, `pcSubSync`, `pcSubNumbers` and then `pcRecompute`. `pcRecompute` rebuilds attacks, AC and speed from equipment and active effects, so don't set `c.ac`, `c.speed` or `c.attacks` directly there.
- `pcFx` calls `pcAbilities`. Never call `pcAC` from inside an `ACT` effect, or they'll loop forever; use `wearingArmor(c)` instead.
- The SRD source data has a few mistakes (missing walking speeds, HP that doesn't match the hit dice). Fix them in `FIXES` in `tools/convert-srd-monsters.py` as well as in the embedded data, so a re-run keeps them.
- Use `totalLv(c)` rather than `c.level` for anything that depends on character level (proficiency, cantrip dice, XP). `c.level` is only the first class's level.
- The Bash safety check can block commands whose text contains the app's double-dollar query helper followed by a bracket. Use the Edit tool, or write a script file first.
- `test/e2e/server.mjs` sets content types by file extension. Add new types there if you add a new kind of file to `public/`.
- In Chromium tests the service worker takes control after the first load; `ctx.setOffline(true)` checks the offline copy.
- `npm run dev` keeps its accounts and campaigns until it's stopped. Restart it before running `test/e2e/walkthrough.cjs` again, or the walkthrough times out waiting for the sign-in form.
- Opening `public/index.html` straight from disk (`file://`) blocks `portal.js`. Test through `npm run dev` or another local server.
- The browser checks share a pattern:
  - Bring the DM page to the front (`bringToFront`) after the TV pop-up opens, or its timers are throttled.
  - Wait for the next TV picture through `window.tvFrames` instead of fixed sleeps.
  - Scroll the map canvas below the sticky header before clicking cells.
  - `test:map` still fails about one run in four on TV picture timing. Rerun it before suspecting the app.
- **Comments in one-line functions:** a `//` comment swallows the rest of the line, including closing braces. Use `/* … */` there. This once broke the whole page.
- **The `.ds` class** is the death-save dot. Don't reuse it for anything else.
- **A stale sign-in.** The browser's `getUser()` trusts any `nf_jwt` cookie, even one the server rejects (expired, or from a re-created Identity instance). `enter()` treats a 401 from `/api/me` by calling `dropSession()` (logout, clear the cookies and `gotrue.user`, put back the browser's own characters) and showing the sign-in form. Other `/api/me` errors offer Try again, another account, or offline use. Never leave the gate without a way out.
