# Dungeon Master's Forge: notes for future chats

These are project notes for the next chat (human or Claude). They cover what the app is, how it's built, the rules the owner has set, and where to find the notes on each feature. The user-facing guide is `README.md`.

## Ground rules from the owner

- **When a change ships, add an entry to the top of `NEWS` in `src/app/18-news.js`** with a new `id`, in plain words for players and DMs. That's what lights up the bell for everyone.
- **Never merge or push to `main` without asking the owner first, in that chat, and getting a yes (owner, 2026-11-18).** A merge or push to `main` starts a Netlify production deploy to the live site, and Netlify credits have run out before ("only testing"). Ask every time, even if an earlier merge was approved. Work on a branch, and test locally with `npm run dev`.
- The owner is on **Windows** and can't run bash scripts. Anything they run themselves has to work in PowerShell or Command Prompt, so prefer `npm run ...` scripts.
- Explain things plainly. The owner tests in the browser rather than reading code.
- **Pull requests are allowed without asking (owner, 2026-11-18).** When a piece of work is finished, tested, reviewed and pushed, open a **draft** pull request into `main` (or push to the existing one) so the owner gets a preview page. Tell the owner the preview link.
- **One open pull request at a time (owner, 2026-11-24).** Add new work, design changes included, to the most recent open pull request's branch instead of opening another one, so there aren't a bunch floating around. Open a new draft only when there's no open one.
- Pushing to a pull request's branch starts a Netlify **deploy preview**, which also uses build credits. Push when the work is ready or when asked, rather than after every small change. Cloud sessions have a stop hook that asks for unpushed commits to be pushed.
- **Test on preview pages, not the live site (owner, 2026-11-16).**
  - Work goes on a branch with a **draft** pull request into `main`, so Netlify builds a deploy preview the owner can try in the browser (`deploy-preview-<PR number>--dungeonmasterforge.netlify.app`).
  - Run the automated checks locally first (`npm run test:all`), and push in batches: one preview build per finished piece of work. Don't push design-only commits on their own.
  - Merge to `main` (a production build) only after asking the owner and getting a yes, usually once they've tried the preview.
  - Previews may use their own copy of the campaign database, so test there with fresh accounts and campaigns.

## Finishing a piece of work: reviews and tests (owner, 2026-11-17)

When code is complete, before pushing it, the work goes through these checks. **All of them must come back clean.** The owner chose the cheaper setup on 2026-11-17, to save usage.
1. **The tests, every time:** `npm test` and `npm run test:all` all pass. A check that passes on its automatic retry counts, but say which one.
2. **The `code-reviewer` agent** (`.claude/agents/code-reviewer.md`) **on Sonnet** (set in its file; the cheaper model), every time. It must say `PASS`: no Critical or Important findings.
3. **The `security-reviewer` agent** (`.claude/agents/security-reviewer.md`, the stronger model) **only when the change touches something risky.** It must say `PASS`: no finding with confidence 8 or more. Risky means:
   - `netlify/` (the API, the database tables);
   - `src/portal.js` (sign-in, campaigns, sharing);
   - `Store` or `Cloud` in `src/app/04-storage.js` (saving to the account), or backups;
   - anything that shows one person's text in another person's browser: character sheets, homebrew, whispers, the Journal, the turn order, rolls;
   - `tools/`, `.github/` or `netlify.toml`.

   When it's skipped, say so and why. For example: "security review skipped: only map drawing changed".

**Keep reviews small.** Give each agent only the commits of the piece of work just finished. Never give it the whole branch, which costs about 150,000 tokens a review; one piece of work costs about 25,000. Tell the code reviewer the tests have just passed, so it only re-runs the checks for that area.

Run the agents side by side. If any check fails:
- fix the mistakes, each with a test that fails before the fix;
- run the tests again, and the reviewer(s) again on **just the fix commit**;
- repeat until everything is clean.

Only then push, and tell the owner what the reviewers found and what was fixed. Minor findings can wait; list them for the owner. If an agent can't run (for example a usage limit), say so and don't call the work reviewed.

## The QA agent (owner, 2026-11-23)

- **`qa-tester`** (`.claude/agents/qa-tester.md`, on Sonnet) goes through the site in a local browser like a player and a DM, looking for bugs and missing features. Examples: spells that don't show on a character sheet automatically, wrong monster stat blocks, broken lists.
- The owner calls it by asking, for example "run the QA agent on character spells" or "do a QA pass on monsters". Give it the area to test. With no area it does a broad pass and stops at about 15 findings.
- It only reports (`QA-1`… bugs, `IDEA-1`… feature ideas). It never changes code, and it keeps its scripts in `.superpowers/qa/` (gitignored).
- **Relay its report to the owner in plain words and wait.** Fix nothing until the owner says which findings to fix. Each approved fix then goes through the usual tests and reviews above.

- **Agent files load when a session starts.** If `code-reviewer` or `security-reviewer` isn't offered as an agent type, start a general agent that reads the file and follows it, and pass `model: sonnet` for the code reviewer.

## What the app is

The Forge is a D&D 5e toolkit with both the 2014 and 2024 rules. It has a character generator, My Characters sheets, spells, items, a Monster Manual, a Dungeon Map with a TV player screen, a campaign tracker, NPCs, a World tab, homebrew and feats. Players and the DM sign in and share one campaign.

Live site: https://dungeonmasterforge.netlify.app (Netlify; production branch `main`).

## Where the code is

| Path | What it is |
| --- | --- |
| `src/index.html` | The page: header, tabs and pop-up windows (HTML only). |
| `src/app.css` | All the styling. |
| `src/app/NN-*.js` | The app's code, in numbered files (table below). Vanilla JS with global functions. |
| `data/spells.json`, `monsters.json`, `items.json` | The built-in rules data (SRD 5.1 and 5.2). |
| `data/extra-*.json` | The open-licensed extra books (Kobold Press, Spells That Don't Suck): monsters, spells, magic items and their credits. See `docs/features/extra-books.md`. |
| `tools/build.mjs` | Builds the page into `public/` (see "How the page is built"). |
| `src/portal.js` | Sign-in, campaigns, shared characters, the Party tab, whispers, homebrew sync. esbuild bundles it into `public/portal.js`. |
| `src/backdrop/` | The background pictures (`corridor-wide.webp`, `corridor-tall.webp`), fingerprinted by the build. See `docs/features/layout.md`. |
| `tools/make-backdrop.py` | Shrinks a source picture into `src/backdrop/` (needs Pillow). |
| `src/sw.js` | The offline helper (service worker); built into `public/sw.js` with the list of files to keep. |
| `netlify/functions/api.mjs` → `netlify/lib/api.mjs` | Campaign API at `/api/*`. `handle(req, user, db)` holds all the routes. `netlify/lib/diff.mjs` writes the activity feed text. |
| `netlify/database/migrations/` | Postgres tables, applied automatically on deploy: `campaigns`, `members`, `characters` (versioned jsonb), `activity`, `whispers`, `homebrew`, `campaign_shared` (the players' Journal and turn order), `user_docs` (each account's own Tracker, World, NPCs, custom items and monsters) and `feature_requests` (the Requests tab). |
| `public/player.html` | The TV player screen. It shows only the pictures the DM's window sends. |
| `public/manifest.webmanifest`, `public/icons/` | Install as an app (PWA). The icons and the header emblem (`emblem.webp`, 144 px, also the picture above empty-page headings) are made from the owner's d20-and-hammers picture (2026-11-24). These keep fixed names, so when they change, bump `CACHE` in `src/sw.js` or the offline helper keeps showing the old ones. |
| `public/vendor/pdfjs/` | pdf.js (`pdfjs-dist` 6.5.438 legacy build, Apache-2.0, unchanged), loaded only when someone imports a PDF. |
| `test/api.test.mjs` | API tests (node:test against PGlite through `@netlify/database-dev`). |
| `test/e2e/*.cjs` | One Playwright check per feature (`npm run test:…`). Each starts its own static server for `public/` and needs no database. `server.mjs` serves the app, the API and an in-memory database (`npm run dev`); `fake-identity.js` stands in for Netlify Identity; `walkthrough.cjs` is a sign-in walkthrough. |
| `test/e2e/fixtures/` | Test files: `companion-zook.json` (a real 5e Companion App character, no personal details), `sheet-wizard.pdf` and `mythweaver-sample.json` (made up). Never commit players' own files or the owner's MythWeaver export: it holds their email. |
| `tools/convert-srd-monsters.py` | Writes `data/monsters.json` from the Open5e SRD files. Its `FIXES` list corrects mistakes in the SRD source. |
| `tools/convert-open5e-extras.py` | Writes `data/extra-*.json` from Open5e's open-licensed books. |
| `tools/make-test-sheet.py` | Writes `test/e2e/fixtures/sheet-wizard.pdf` (needs pypdf). |
| `tools/test-all.mjs` | `npm run test:all`. |
| `.github/workflows/checks.yml` | GitHub runs `npm run build` and `npm run test:all` on every pull request (GitHub minutes, not Netlify credits; notes-only pushes skipped). It installs Playwright 1.63 for the run, because `package.json` doesn't list it. |
| `tools/netlify-skip.mjs` | Netlify's `ignore` step: skips a build when a push only changes notes, tests or tools (exit 0 = skip). |
| `.claude/agents/` | The `code-reviewer` and `security-reviewer` agents, run on every finished piece of work (see "Finishing a piece of work"), and the `qa-tester` agent, run when the owner asks (see "The QA agent"). |
| `docs/features/` | Notes on each feature: how it works and its function names (table below). |
| `docs/superpowers/` | One design (`specs/`) and one plan (`plans/`) per piece of work, dated. Read the matching pair before changing a feature. |
| `.superpowers/` | Scratch space for build sessions (gitignored). Nothing there is needed. |

**The code files** (`src/app/`), joined in this order:

| File | What's in it |
| --- | --- |
| `00-guard.js` | **The page guard**: strips event-handler attributes, `javascript:` links, frames and objects from anything the app adds to the page, a safety net for code hidden in shared text (characters, homebrew, campaign text). **Not complete** (synchronous `.focus()`/`.click()` after an insertion beats it), so `esc()` in every template is the real protection |
| `01-core.js` | `dmData` (the rules data loader), utilities (`$`, `esc`, `toast`), seeded random numbers (`makeRng`), encounter maths, content tables |
| `02-adventure.js` | The Generate tab: adventures and chapter briefs |
| `03-dungeon-map.js` | Dungeon generator, fog, drawing, map UI, imported maps and VTT files, the TV (`HOST`) and tokens |
| `03a-rough.js` | Rough.js 4.6.6 (MIT, unchanged bundled build): the global `rough`, for hand-drawn lines |
| `03b-map-looks.js` | The Dungeon Map's hand-drawn looks (`mapLook`): Inked sketch, Old atlas, Stone and torchlight |
| `04-storage.js` | `saveFile`, Backup and restore, `Store`, and `Cloud` (the DM's data saved to their account) |
| `05-tracker.js` | Campaign Tracker: campaigns, NPC pictures, Lore, recaps, calendar, encounters, random encounters, campaign files |
| `06-npcs-world.js` | NPC generator, Your NPCs, the World tab and World builder |
| `06b-atlas.js` | World and region maps: terrain (`atlasTerrain`), drawing (`atlasDraw`), pins (`atlasPinsFill`), the map view, import, the TV |
| `07a-classes.js` | `CLASS_DATA`, class feature text, subclasses (`subclassList`, `subclassLevel`), `classList`, homebrew classes (`hbClassData`) |
| `07b-feats-homebrew.js` | Feats (`FEATS`, `featList`), homebrew (`HB`, `hbApply`, `HB_FX`, `hbEffects`), pending homebrew |
| `07c-species.js` | Species (`PC_RACES`, `raceInfo`), their defences, species features by level |
| `07d-builder.js` | The step-by-step custom builder (`CB`) |
| `07e-generator.js` | `generateCharacter`, the Characters tab's `sheetHTML`, the quick forge |
| `08-spells.js` | The spell browser |
| `09-character-sheets.js` | Saving characters, prepared spells, sheet export, spell cards |
| `10-monsters.js` | Villain generator, Monster Manual, monster builder, companions and Wild Shape |
| `11-items-shops.js` | Items tab and shops |
| `11b-hoard.js` | The treasure hoard generator (`hoardRoll`, `hoardToLoot`): Items tab and the Tracker's Loot tab |
| `12-level-homebrew-feats.js` | Level up, the Homebrew tab, the Feats tab |
| `12b-bulk-import.js` | Bulk import (Homebrew tab): CSV or JSON files of spells, feats, species, backgrounds, subclasses, items and monsters; see `docs/features/bulk-import.md` |
| `13a-gear-ac-speed.js` | My Characters: inventory and attacks (`pcAttacks`), armor training, AC (`pcAC`), speed (`pcSpeed`) |
| `13b-abilities-rests.js` | Resources (`pcResources`), the Abilities list, activations (`ACT`), their dialogs, rests, Wild Shape |
| `13c-dice-conditions-casting.js` | Conditions, exhaustion, concentration, death saves, the dice roller and roll dock, casting from the sheet |
| `13d-choices.js` | Choices inside features and feats (`CHOICES`), the equipped-items list |
| `13e-sheet.js` | The roster and the editable sheet (`renderRosterMain`), its events, older-save upgrades |
| `14-boot.js` | The toolbar, `route()` (switching tabs) and start-up |
| `15-torch.js` | Live flames on the background picture's torches (`BACKDROPS`), and the header torches: at most 30 frames a second (20 and normal resolution on phones), header torches skipped while the header is away |
| `16-character-import.js` | Companion App, PDF and Fifth Edition Character Sheet (XML) import, the Import character window |
| `17-mythweaver.js` | MythWeaver import and the Import campaign window |
| `18-news.js` | What's new (`NEWS`) and Install app |
| `19-fold.js` | Folding list groups and sheet sections (▾ on a `.sec-h`, Fold all), remembered in `dmforge.fold.v2`. Lists start folded; sheets start open |
| `20-requests.js` | The Requests tab: feature requests (`RQ`, `rqBrief`); see `docs/features/requests.md` |

To find a function, search `src/app/` (for example `grep -n "function pcLevelTo" src/app/*.js`).

## How the page is built

- `npm run build:app` (part of `npm run build`, which Netlify runs) writes:
  - `public/assets/app.<fingerprint>.js`: the `src/app/*.js` files joined in order, under one `"use strict"`;
  - `public/assets/app.<fingerprint>.css` from `src/app.css`;
  - `public/assets/spells|monsters|items.<fingerprint>.js` from `data/*.json` (each sets `DMDATA.<key>` to the JSON as text), and `extra-*.<fingerprint>.js` from the extra books;
  - `public/credits.html` (the extra books' credits and licences) from `data/extra-books.json`;
  - `public/index.html` from `src/index.html`, and `public/sw.js` from `src/sw.js`, pointing at those names.
- **These are build output and aren't in git.** Edit `src/` and `data/`. Every `npm run test:…` and `npm run dev` builds first, so tests always run the current code.
- The fingerprint is a short code made from the file's contents. Netlify serves `/assets/*` with a one-year cache, and the service worker keeps those files without asking the server again, so repeat visits only fetch the small page. When a file changes, its name changes, so updates still show at once.
- The build checks the joined code for syntax errors first and names the file and line, so a typo can't blank the page.
- **The code files are plain scripts sharing one global scope**, as when they were one `<script>`: a function or top-level `const` in one file can be used from any other. Order matters only for code that runs at start-up; `14-boot.js` starts the app, before 15 to 18 have run their own start-up lines.
- **Rules data:** `dmData("spellData" | "monsterData" | "itemData")` parses each set once and shares it, with the extra books joined to the end of both editions' lists (entries with `src`). `spLoad`, `bsLoad` and `itLoad` add their own fields on top. The Monster Manual, random encounters and MythWeaver import share one monster list.
- To change the rules data, edit `data/*.json` (or re-run `tools/convert-srd-monsters.py`, which writes `data/monsters.json`).

## Commands

```
npm install
npm run dev       # full local copy at http://localhost:8899 (any OS); stand-in sign-in, data wiped on Ctrl+C
npm run test:all  # every check below, three at a time, with one pass/fail list (any OS). Failed checks are run once more.
                  #   npm run test:all -- map tv    only checks whose names contain "map" or "tv";   -- --serial   one at a time
npm test          # API tests
npm run build     # build the page and bundle the portal (what Netlify runs)
npm run build:app # build the page only
```

One check per feature (Playwright, any OS): `test:assets` (fingerprinted files, repeat visits, offline), `test:map`, `test:backup`, `test:tv`, `test:mapvis` (map looks, including the hand-drawn ones), `test:mapio`, `test:shop`, `test:random`, `test:cards`, `test:mapenc`, `test:calendar`, `test:recap`, `test:sheet` (432 sheets vs the rules), `test:tokens`, `test:npcpic`, `test:hbspell`, `test:hbpend`, `test:import`, `test:layout`, `test:lore`, `test:mythweaver`, `test:campextras`, `test:npclib`, `test:world`, `test:setup` (builds the portal, port 8897), `test:sync` (the DM's data in their account, two devices, port 8896), `test:share` (the players' Journal, turn order on phones, shared rolls; port 8895), `test:hbclass` (homebrew classes), `test:atlas` (World and region maps, their shapes, climates, roads, borders, and the Region builder's towns and kingdoms), `test:polish` (the Adventure, Characters and Items tabs after the 2026-11-18 UI review), `test:cast` (spell bubbles and the spell window), `test:backdrop` (the background pictures and their live torches), `test:lorelink` (Lore items, monsters and encounters filling their tabs; folding lists), `test:chartab` (one Characters tab: forge, drafts, save, reroll, discard, the builder), `test:hoard` (treasure hoards), `test:third` (Eldritch Knight and Arcane Trickster spellcasting), `test:requests` (the Requests tab, port 8894), `test:extras` (the extra books), `test:bulk` (bulk import), `test:book` (rulebook parchment and the book font), `test:qafix` (fixes from the 2026-11-23 QA pass: monster data, import reports, tiny Wild Shape attacks), `test:subchange` (changing a sheet's subclass), `test:qabrowser` (fixes from the 2026-11-23 browser QA pass: Tracker campaign for new DMs is in `test:setup`; here shop wording, lone-monster encounter hooks, the Compendium icon, the Forge form and bottom bar on phones, the open character after a refresh; QA pass 2: extra monsters' actions and damage lines, Wild Shape attacks and list, Unarmored Defense from a second class; QA pass 3: "QA3" lines).

Playwright and Chromium are pre-installed in cloud sessions. To test offline mode (no sign-in screen), run `localStorage.setItem('dmforge.offline','1')` in an init script.

## Notes on each feature

| File | Covers |
| --- | --- |
| `docs/features/characters.md` | **How a character is built** and the fields worth knowing. Read it before changing sheet maths. Also the sheet checks and spell cards. |
| `docs/features/history.md` | Items 1 to 28: portals, Monster Manual, level up, ASIs, feats, homebrew and its effects, species defences, the sheet upgrade (equipment, abilities, resources), backgrounds, gender, dice and conditions, casting, multiclassing, choices, encumbrance, XP, PWA, the What's new bell. |
| `docs/features/dungeon-map.md` | Player screen and fog, map looks, import and export, map rooms to encounters, tokens. |
| `docs/features/dm-tools.md` | Shops, random encounters, calendar and weather, session recaps, backup and restore. |
| `docs/features/import.md` | Character import (Companion App, PDF), pending homebrew, Lore and MythWeaver, campaign files with custom content. |
| `docs/features/npcs-world.md` | NPC pictures, Your NPCs and imported monsters, the World tab. |
| `docs/features/players-share.md` | What the DM shares with signed-in players: the Journal tab, turn order on phones (`📱 Show players`), shared rolls. |
| `docs/features/homebrew-classes.md` | Homebrew classes: how they join `CLASS_DATA`, `classList(ed)`, the editor, and import of unknown classes. |
| `docs/features/world-maps.md` | World and region maps: data (`place.atlas`, `W.atlas`, `place.found`), pins, the map view, import, the TV. |
| `docs/features/layout.md` | Phone and laptop layout, and the background picture. |
| `docs/features/requests.md` | The Requests tab: feature requests, the owner setting (`FORGE_OWNER_EMAILS`), the API. |
| `docs/features/extra-books.md` | The extra books: their files, how they join the lists, the Book filter, licences and the credits page. |
| `docs/features/bulk-import.md` | Bulk import: file formats, the templates, what each kind becomes. |
| `docs/features/accounts.md` | The DM setup screen, renaming a campaign, and **the DM's data saved to their account** (`Cloud`, `/api/me/docs`). |

**Most important rules from those notes:**
- Level changes go through `pcLevelTo(c, lv)`, which regenerates the character. It passes `pcKeep(c)` so a rebuild never re-rolls scores or skills; don't remove it. **A new derived character field must go in the `pcLevelTo` copy list.**
- Loading an older save goes through `pcEnsure`; new data fields need a migration there.
- **When you add a new kind of saved data, add its localStorage key to `BACKUP_KEYS`.**
- Use `totalLv(c)` rather than `c.level` for anything that depends on character level.
- **Spellcasting can come from a subclass:** use `castOf(cls, subclass)` (not `CLASS_DATA[cls].cast`) and `castListOf` for the spell list. Eldritch Knight and Arcane Trickster are third casters (`SUB_CASTERS`, `thirdSlots`, `THIRD_KNOWN`).
- **Class pickers use `classList(ed)`; random picks use `builtInClasses()`** (homebrew classes live in `CLASS_DATA` with `hb: true`).
- **Never send the TV map data, room key text or HP numbers.** It only gets finished pictures, and monster state as "Bloodied" or "Down". The same goes for the turn order on players' phones (`turnsNow`), and the players' Journal never carries quest notes or DM-only Lore sections.

## Saved data

- **In the browser** (also used by "Use without an account"):
  - `dmforge.pcs.v1` (characters), `dmforge.campaigns.v1`, `dmforge.homebrew.v1`, `dmforge.items.v1`, `dmforge.mymonsters.v1`, `dmforge.favspells` and `dmforge.offline`.
  - `dmforge.npclib.v1`: NPCs that aren't in any campaign (Your NPCs on the NPC tab).
  - `dmforge.world.v1`: World places (the World tab), with region maps on the places and the world map as `atlas`.
  - `dmforge.fog.v1`: map fog, found secret doors and tokens for the 40 most recent maps.
  - `dmforge.lastBackup`, `dmforge.newsSeen`, `dmforge.hdrMini`.
  - **Imported map pictures and NPC pictures** are in IndexedDB (database `dmforge-maps`), not localStorage.
  - The 💾 Backup file (v2) covers the keys in `BACKUP_KEYS` and the pictures (`images`: key → data URL, from `MAPIMG.all()`). Restoring a v2 backup replaces the pictures; a v1 backup leaves them alone.
- **Campaign fields added on 2026-11-15** (saved with the campaign, signed in or not):
  - `cal`, the calendar. `recapAt` and `recapDay`.
  - Encounters: `kind` ("random", "map" or "import"), `room` and `recapped`. Quests: `recappedAs`. Loot and chapters: `recapped`.
  - Map entries: `style`, `fog`, `found` and `tokens`, plus `kind:"image"` records for imported maps.
- **Fields added on 2026-11-16 and 17:**
  - Campaigns: `lore` (the Lore tab), and `mwId`/`mwAt` on campaigns imported from MythWeaver. NPCs and lore entries can carry `mwId` too.
  - Tracker NPCs: `img` (key `npc-<npc id>` in the `dmforge-maps` IndexedDB) or `imgUrl` (an https link), `lib`, `placeId` and `place`.
  - Characters: `hbPending` (homebrew waiting for the DM), `importedFrom: {app, at}` and `mwId`.
  - Homebrew can be `kind: "spell"`.
- **Signed in:** characters and homebrew live in Postgres, per campaign. Homebrew is polled every 30 seconds. Every character save bumps `version`, so if two people save the same sheet at once, the second one is asked which version to keep. The version check is inside the `UPDATE` (and a duplicate create returns 409, not 500), so saves at the very same moment can't both win; `user_docs` works the same way.
- **Signed in as a DM:** the Tracker campaigns, World, Your NPCs, custom items and My monsters are also saved privately to the account (`user_docs`, `Cloud`). The usual localStorage keys then hold that account's copy; the browser's own data waits in `dmforge.stash.v1` and comes back on signing out. `dmforge.sync.v1` tracks versions and unsent changes. See `docs/features/accounts.md`.
- **Campaign saves are written 600 ms after a change** (`Store.save`). Tests that reload must wait for that first.

## Where things stand (2026-11-19)

- **PR #9** (all the 2026-11-16/17 work) was merged to `main` at the owner's request on 2026-11-17.
- **Branch `ccr-b5259a07-6lu9sb`** (after PR #9): organization and speed work.
  - `npm run test:all`.
  - The rules data moved to `data/` and loads from fingerprinted files.
  - One shared monster list.
  - `public/index.html` split into `src/index.html`, `src/app.css` and `src/app/*.js`, joined by `tools/build.mjs`.
  - These notes split into `docs/features/`.
  - Netlify skips builds for notes-only pushes (`tools/netlify-skip.mjs`).
  - **The DM's Tracker, World, NPCs, custom items and monsters saved to their account** (`Cloud`, `/api/me/docs`, `npm run test:sync`).
  - Later the same day, in the same PR: the players' Journal, turn order on phones and shared rolls; homebrew classes; **World and region maps** (`06b-atlas.js`, `npm run test:atlas`).
  - The page went from 829 KB to about 14 KB compressed on repeat visits when nothing changed. The code (about 360 KB compressed) and the data (about 440 KB, plus about 1.1 MB for the extra books since 2026-11-20) are downloaded again only when they change.
- **PRs 10 to 13 were merged to `main`** at the owner's request (11 on 2026-11-18; 12 and 13 later the same day):
  - **PR 11:**
    - shops made in the World builder (rarity, stock size, manner, markup, own prices, sold stays sold, Restock; `docs/features/dm-tools.md`);
    - the side panels' steady scrollbar gap;
    - the **Region builder** (World builder → 🗺️ Region; `docs/features/world-maps.md`);
    - the **UI polish** of the Adventure, Characters and Items tabs (`npm run test:polish`; `docs/features/layout.md`);
    - **Fifth Edition Character Sheet import** (`fecsImport`; `docs/features/import.md`).
  - **PR 12:**
    - **spell bubbles** and the spell window (tap a prepared spell for its rules, Cast at a chosen level; `npm run test:cast`);
    - **one Spells box** on both sheets (DC, slot counters and prepared spells together; Attacks is just attacks);
    - **multiclass casters prepare their caster class's spells** (`pcCastClasses`). Notes: `docs/features/history.md`, item 20.
  - **PR 13:** a photo-real corridor background with live flames on its torches, and a tall picture for phones (`npm run test:backdrop`).
- **PR 14** (branch `claude/brave-dirac-2mvyiu`), merged to `main` at the owner's request on 2026-11-18: saving a Lore Item, Monster or Encounter adds it to Items → Custom, My monsters or the Encounters tab (`loreLink`; `docs/features/import.md`), and long lists and sheet sections fold (`19-fold.js`; `docs/features/layout.md`).
- **PR 15** (branch `claude/brave-dirac-2mvyiu`), merged to `main` at the owner's request on 2026-11-19. It holds everything below up to the Requests tab: folding lists, one Characters tab, the page guard and character safety fixes, Keep mine, treasure hoards (with encounters), Eldritch Knight and Arcane Trickster spellcasting, and the Requests tab.
- **Branch `claude/brave-dirac-2mvyiu`, after PR 14:** Items, Spells and Monster Manual groups start folded (owner's choice: lists only, not sheets); searching opens them. Character sheets have a Fold all switch too, and sheet titles on phones are no longer cut short (that bug went out with PR 14). Tests that click rows in those lists open a group first.
- **Same branch, 2026-11-19 (owner's order):** 1. Characters and My Characters merged into one tab (owner's choice: one tab, not just one sheet layout). Then 2. the iron-and-oak look (tried and **rejected by the owner**: "I don't like the wood look at all"; skipped for now), 3. a treasure hoard generator (done, `11b-hoard.js`), 4. Eldritch Knight and Arcane Trickster spellcasting (done: `castOf(cls, subclass)`), all to PR 15.
- **Requests tab (2026-11-19):** feature requests stored in the database (`feature_requests`); the owner is whoever's email is in the Netlify setting `FORGE_OWNER_EMAILS` (the owner has to add it). When the owner asks to build a request, they paste its brief from **📋 Copy as a brief**.
- **Main screen look:** a wood-and-iron restyle was tried on 2026-11-19 and the owner rejected it; they chose to skip the look for now. Don't bring back wood.
- **Work branch:** cloud chats use their own `claude/…` branch. After a merge, start the next piece from the latest `main`.
- **The owner's order of import work:**
  1. Companion App import: done.
  2. Homebrew classes, for classes the Forge doesn't have, like Blood Hunter: **done** (2026-11-17). Imports with an unknown class make a homebrew class.
  3. PDF import: done.
  4. MythWeaver: done.
  5. Fifth Edition Character Sheet app (XML export): done (2026-11-18). Unknown spell entries go to notes, never homebrew (owner's choice); a "Custom" background stays a plain name.
- **Small things left alone (the owner knows):**
  - PDF expertise beyond what the class grants is dropped without a note.
  - A PDF's portrait isn't imported.
  - Deleting a whole campaign leaves its NPCs' uploaded pictures in IndexedDB.
  - The tag-based sorting of MythWeaver "generic" lore is a best guess.
  - **Lore links:** once a Lore-made monster has stats, saving its Lore entry still replaces its description (items have a `loreOff` guard; monsters don't). Deleting a made item, monster or encounter and saving the Lore entry again makes it again.
  - **Shops:**
    - an item bought at a marked-up price shows the list price as its inventory value;
    - a markup change made within ⅓ second of closing the shop isn't saved;
    - if an account sync reloads the World while a shop is open, later purchases might not save;
    - "Edit in the World" doesn't check that the place still exists.
  - **Region builder:** a typed feature name stays on its slot when Shape or Land changes (Roll again clears them).
  - **Side panels:**
    - every side panel's main button (Generate Dungeon, Summon NPCs, Forge creature) also stays in view at the bottom on laptops;
    - the panels keep about 8 px for the scrollbar.
  - **Spells:**
    - the Spellcasting and Pact Magic feature texts still say "shown under Attacks & Spellcasting" (now the Spells box);
    - on the Characters tab, Browse sits under the slots;
  - **Fixed 2026-11-19:** the clash dialog's Keep mine always failed (the API crashed on a missing `baseVersion`).
  - **Tests:** `test:map`'s "TV shows the box-hidden entrance as fog" fails about one run in three, on `main` too (a timing problem).
  - **Tests:** `test:atlas` also fails now and then when the machine is busy and passes on `test:all`'s retry (seen several times on 2026-11-19, before and after the page guard).
- **Extra books (2026-11-20, branch `ccr-e270467c-w9cy1p`):** the owner asked to scrape 5e.tools; declined, because it carries Wizards of the Coast's paid books (owning them doesn't allow republishing). **Never add non-SRD Wizards content to the site's data.** The owner chose the free open-licensed extras instead: 1,695 monsters, 920 spells and 1,062 magic items, in every list and in random encounters, shops, hoards and spell choices; then 11 species, 97 subclasses, 14 feats and 25 backgrounds as built-in homebrew-shaped entries (`hbBook`; `docs/features/extra-books.md`); and **bulk import** for DMs' own content (`12b-bulk-import.js`, `docs/features/bulk-import.md`). Not done yet: the Adventure and Dungeon Map generators using the full monster list (needs care: saved maps are rebuilt from their seed).
- **Browser QA pass (2026-11-23, branch `ccr-d9d297c3-t59qig`):** an agent clicked through the whole app (DM, player, phone, offline). No errors; fixed what it found (`npm run test:qabrowser`, plus the Tracker check in `test:setup`). **Forged spellcasters starting with no spells chosen is on purpose (owner, 2026-11-23); don't "fix" it.** Left alone as probably intended: the progression window opening on every Forge pick, Items → Generate a shop moving to the World tab, the Adventure tab swapping a reversed level range, the bell showing 9+ for new accounts.
- **QA pass 2 (2026-11-24, `qa-tester`):** fixed Tome of Beasts 3 monsters with no Actions, Black Flag Wild Shape forms with no attacks (`beastForm` strips `_`/`*`), Unarmored Defense from a second class (`pcAC`), Black Flag damage lines (`tidy_damage` in the converter), and the Wild Shape list waiting for the extra books (`wildBeasts`). Checks: the "QA2" lines in `test:qabrowser`. Not done (ideas): Disciple of Life in the heal preview, a note that Extra Attack doesn't stack, the book on Wild Shape forms.
- **QA pass 3 (2026-11-24, `qa-tester`):** fixed enemy initiative ignoring monsters' bonus (`foeInit` in the Tracker), companions for multiclass Druids and Rangers (`compKinds` uses `clsLv`) and Circle of the Moon limits (`compRule` uses `wildShapeLimit`; `druidSub`), Feats tab levels for multiclass characters (`totalLv`), monster builder hit points of 0 or less (the average), book-reference beasts' attacks in `beastForm`, prices under 1 gp (`fmtGp`), and the Tracker's encounter boxes and title on phones. Checks: the "QA3" lines in `test:qabrowser`. Ideas not done: selling to shops, buying several, Save to Your NPCs, Redo. **Done the same day (owner's pick, ideas 4 and 5):** numbered map tokens (`tokName` in `tokAdd`), and Group by monster initiative (`e.groupInit`, one roll per `stat`), with a confirm before re-rolling a fight past round 1. Checks: the "IDEA" lines in `test:qabrowser`.
- **Map art (2026-11-24, owner's request, added to PR 27):** three hand-drawn Dungeon Map looks with Rough.js (`03b-map-looks.js`; `docs/features/dungeon-map.md`), and Azgaar-style region maps written for the Forge: new shapes, climates, lakes, a richer painted look, roads and borders from the pins, and towns and kingdoms in the Region builder (`docs/features/world-maps.md`). **Old maps must keep their land:** new terrain only goes behind a new shape, a climate or `v: 2` (`atlasKey`). The owner looked at Lost Atlas (lostatlas.co) for ideas, but that site refuses automated visits.
- **Ideas not yet done:** pictures in account saves (they're in backups now).

## Gotchas found along the way

- **Edit `src/`, not `public/index.html`.** `public/index.html`, `public/sw.js` and `public/assets/` are rebuilt from `src/` and `data/` and aren't in git.
- **Never add event-handler attributes (`onclick="…"`), `javascript:` links or iframes from JavaScript.** The page guard (`00-guard.js`) strips them from anything added to the page. Use `addEventListener` and delegated `data-` attributes, as the rest of the app does.
- **Comments in one-line functions:** a `//` comment swallows the rest of the line, including closing braces. Use `/* … */` there. (The build now catches the syntax errors this causes.)
- **One character sheet (since 2026-11-19).** Characters and My Characters are one tab (`#roster`; `#character` is an alias that opens the forge form). A freshly forged character is a **draft**: `currentPC`, not in `PCS.roster`, shown on the same editable sheet (`rosterHTML`) with `draftBarHTML` on top (Save / Reroll / Discard). `rosterCur()` returns the draft when `RC.id` is its id; `pcIsDraft(c)` tells them apart. Drafts are never sent to a campaign (only `PCS.roster` is synced). `route()` rewrites `#character` to `#roster`, because refreshes check the address. `pcEnsure` runs `pcNums`, so a character's number fields are numbers. **Every character from the campaign** goes through `incoming` in `portal.js` (`pcIncoming`: numbers and rules edition only; text stays as typed). `sheetHTML` is gone. `#pcOut` now only holds the step-by-step builder (`pcShow("build" | "sheet")`).
- Segmented radio inputs are hidden. In Playwright, click `label.opt:has(input[...])`.
- Once `portal.js` is built, the sign-in gate covers the page. Set `dmforge.offline` to `1` for offline tests.
- Resilient is **not** repeatable.
- Homebrew row inputs need their font reset (`.hb-row input`), because otherwise they inherit the uppercase label style.
- Tag wording: "Condition immunities", "Advantage on: saves vs frightened, WIS saves", and "immune to exhaustion" rather than "can't be exhaustion".
- On My Characters, `renderRosterMain` runs `pcInvUpgrade`, `pcSubSync`, `pcSubNumbers` and then `pcRecompute`. `pcRecompute` rebuilds attacks, AC and speed from equipment and active effects, so don't set `c.ac`, `c.speed` or `c.attacks` directly there.
- `pcFx` calls `pcAbilities`. Never call `pcAC` from inside an `ACT` effect, or they'll loop forever; use `wearingArmor(c)` instead.
- The SRD source data has a few mistakes (missing walking speeds, HP that doesn't match the hit dice). Fix them in `FIXES` in `tools/convert-srd-monsters.py` as well as in `data/monsters.json`, so a re-run keeps them.
- The Bash safety check can block commands whose text contains the app's double-dollar query helper followed by a bracket. Use the Edit tool, or write a script file first.
- `test/e2e/server.mjs` sets content types by file extension. Add new types there if you add a new kind of file to `public/`.
- In Chromium tests the service worker takes control after the first load; `ctx.setOffline(true)` checks the offline copy.
- `npm run dev` keeps its accounts and campaigns until it's stopped. Restart it before running `test/e2e/walkthrough.cjs` again, or the walkthrough times out waiting for the sign-in form.
- Opening `public/index.html` straight from disk (`file://`) doesn't work. Test through `npm run dev` or another local server.
- The browser checks share a pattern:
  - Bring the DM page to the front (`bringToFront`) after the TV pop-up opens, or its timers are throttled.
  - Wait for the next TV picture through `window.tvFrames` instead of fixed sleeps.
  - Scroll the map canvas below the sticky header before clicking cells.
  - `test:map` and `test:npcpic` sometimes fail on timing when the machine is busy; `test:all` reruns failures once.
- **The `.ds` class** is the death-save dot. Don't reuse it for anything else.
- **Don't use `<nav>` for new bars.** The header's `nav a` styles, including an icon `::before`, apply to every `nav`.
- **Scores in imports differ by source.** The Companion App and PDFs give final scores (solved backwards in `importBuild`); MythWeaver gives starting scores (`D.base`). Imports must set `bonus: "fixed"`, or `pcLevelTo` moves the species bonus on the first level-up.
- **pdf.js 6.5's `getFieldObjects()` returned nothing** for real sheets; read widgets with `page.getAnnotations()` instead.
- **On phones the header can be away** (`hdr-away` on `<html>`). Anything placed relative to header elements must measure where the header ends up, not where it is mid-slide (see `newsOpen`).
- **Grid columns need `min-width:0`** (already set for `.layout` and `.tlayout`). Without it, one wide child widens the whole page on phones.
- **Headless Chromium hides scrollbars**, so a layout bug that depends on a scrollbar's width won't show in a test unless the browser is launched with `ignoreDefaultArgs: ["--hide-scrollbars"]` (see the side-panel check in `test/e2e/layout.cjs`).
- **`.map(fn)` passes the index as the second argument.** Don't pass a function with an optional second parameter straight to `.map` (`prepBubble` hid the first ✕ that way).
- **The Bash safety check also trips on long inline scripts** containing words like `remove(`. Write the script to a file with the Write tool, then run it.
- **A stale sign-in.** The browser's `getUser()` trusts any `nf_jwt` cookie, even one the server rejects. `enter()` treats a 401 from `/api/me` by calling `dropSession()` and showing the sign-in form. Never leave the gate without a way out.
