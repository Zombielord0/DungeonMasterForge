# NPCs, NPC pictures and the World tab

Code: `src/app/06-npcs-world.js`; NPC pictures in `05-tracker.js`.

Moved here from `CLAUDE.md` on 2026-11-17, unchanged except that `public/index.html` now means the files in `src/app/` (see "How the page is built" in `CLAUDE.md`).

## NPC pictures (2026-11-16)

- **Data.** A Tracker NPC can have `img` (a key `npc-<npc id>` in the `MAPIMG` IndexedDB, the same store as imported map pictures) or `imgUrl` (https only, checked by `npcUrlOk`). Setting one removes the other. Uploads are shrunk to `NPC_PIC_MAX` (2048 px).
- **Functions.** `npcPicHTML(it)` draws the frame inside the NPC list item (`.npc-row`, `.npc-body`); `npcPicFill()` loads stored pictures into object URLs, or says "Picture not on this device". The buttons are `data-npcpic="add|link|tv|clear"` and the hidden file input is `#npcPicFile`. `npcPicSet`, `npcPicLink`, `npcPicClear` and `npcPicTV` do the work. `MAPIMG.del` was added, and deleting an NPC deletes its stored picture.
- **On the TV** it's a handout (`handoutShow`), started with `hostStart` if needed. Only the picture is sent. The player screen already letterboxes every picture (`Math.min` scale), so nothing is stretched; the frame uses `object-fit: contain`.
- Pictures aren't in backups (like map pictures). A link from a site without CORS can be shown in the frame but can't be sent to the TV; the toast says to upload it instead.
- **Tests:** `npm run test:npcpic` (`test/e2e/npc-pictures.cjs`).
- **Campaign saves are written 600 ms after a change** (`Store.save`). Tests that reload must wait for that first.

## Your NPCs and imported monsters (2026-11-17)

- **NPC data stays in each campaign** (`c.npcs`), so the Tracker's NPCs tab is unchanged. Copies of one NPC in several campaigns share `lib` (`npcLibId(n)`: set lazily to `"mw-<mwId>"` or `"nl-<id>"`).
  - NPCs in no campaign are kept in localStorage `dmforge.npclib.v1` (`npcLoose`/`npcLooseSave`, in `BACKUP_KEYS`). Tracker campaigns are browser-only even when signed in, so this matches.
  - `npcGroups()` merges campaigns and loose NPCs into `{lib, n, camps, loose?}`.
  - `npcSync(n)` copies `NPC_SHARED` (name, role, attitude, notes, img, imgUrl) to every other copy. It runs from the Tracker's `onEdit` (list `npcs`) and from `npcPicSet`/`npcPicLink`/`npcPicClear`.
  - A picture key may be shared by copies: delete it from `MAPIMG` only when `npcImgUsed(key)` is false.
- **The list** is `#npcLib` on the NPC tab (`renderNpcLib(listOnly)`, state `NL = {q, camp, open}`), drawn by `route()` for `#npc`.
  - Campaign tick boxes are `[data-nlc=<campaign id>]` inside `.chip` labels → `npcLibToggle(lib, campId, on)`. Unticking the last campaign moves the NPC to the loose list.
  - Fields `[data-nlf]` → `npcLibEdit`; buttons `[data-nl]` = new, open, del (`npcLibDelete`, everywhere).
- **MythWeaver monsters:** `mwMonster(x)` returns a builder form (`mbBlank` shape) with `mwId` and `src`. It reads size/type, AC, HP and hit dice, the six scores (`STR 16` or a row of `16 (+3)`), speed, CR (nearest `CR_LIST`), senses, languages and defences. "Name. Text" lines become traits, or actions/bonus/reacts/legend under those headings.
  - Without AC, HP and all six scores it sets `needsStats` (shown as "needs stats" in `mbRenderLib`; cleared when saved from the builder in `mbStore`).
  - `mwExtras` now also returns `monsters`; `campExtrasAdopt` skips ones whose `mwId` or name is already in `MB.lib`.
- **Places:** superseded by the World tab (below): an NPC's place is now a World place id (`placeId`), with `place` kept as its name.
  - The list has tabs (`.npc-tabs`, `[data-nltab]` = a World place id, `NL.tab`: "" = all, "-" = no place) from `npcPlaceTabs`. Only places with NPCs get a tab.
  - Each row has a `[data-nlmove]` select (`npcMoveHTML` → `wpOptionsHTML`, with `NL_NEW` for "＋ New place…").
  - MythWeaver NPCs get a place name from `mwNpcPlace(x, places)`: a tag, or a Location/Lives/Home section, naming one of the campaign's Place lore entries. `worldAdopt` then links it to the World place. A place the DM already set isn't changed on re-import.
- **MythWeaver encounters** → `c.encounters` too (`mwEncounter`, `kind: "import"`, `mwId`), alongside Lore.
  - `mwFoes(text, idx)` finds monster names with counts ("3 goblins", "two bugbears", "Ogre x2", "a wolf"), longest names first, each stretch of text used once, the largest count per monster.
  - `mwMonsterIndex(extra)` = My monsters, this import's monsters (`mwMonster`), then the Monster Manual (2014 first). Enemies take AC and HP from it.
  - Re-import updates the name and notes only, and fills enemies only if the fight has none, so play progress is kept.
- **Tests:** `npm run test:npclib` (`test/e2e/npc-lib.cjs`), including places and encounters.

## World tab (2026-11-17)

- **Data:** `W.places = [{id, name, type, parent, desc, sections?, tags?, imgUrl?, mwId?}]` in localStorage `dmforge.world.v1` (`worldLoad`/`worldSave`, in `BACKUP_KEYS`). It's shared by every campaign. Types and icons are in `WP_TYPES`; `wpGuessType(...texts)` guesses one (tags first, then name, then description).
  - Helpers: `wp(id)`, `wpPath`/`wpPathText`, `wpKids(id)` (a place whose parent is missing counts as top level), `wpUnder(id)` (itself plus everything inside), `wpNew`.
- **Lore link:** a campaign has a place when its Lore has `{type:"place", wpId}`.
  - `worldAdopt()` links Lore places to World places (by `wpId`, then `mwId`, then name; otherwise it makes one), and turns NPC `place` names into `placeId` (`npcPlaceFix`). It runs after `Store.init`, on the NPC and World tabs, in the Tracker's NPCs tab, after Lore saves and after both kinds of campaign import.
  - World → Lore: `wpSyncOut(p)` copies `WP_LORE` (name, desc, sections, tags, imgUrl) to every linked Lore entry, and the name to NPCs' `place`. Lore → World happens in the Lore save handler.
  - Campaign tick boxes: `[data-wc]` → `wpSetCamp(p, c, on)` adds or removes the linked Lore entry.
- **NPCs:** `placeId` (plus `place`, the name kept in step) is in `NPC_SHARED`. `npcLibSet(lib, obj)` sets several fields on every copy.
  - `npcPlaceTabs(list, cur)` builds the tab strip for both lists: the NPC tab (`data-nltab`, `NL.tab`) and the Tracker (`data-tntab`, `TN.tab`). A place's tab includes `wpUnder`.
  - Place pickers use `wpOptionsHTML(cur, noneLabel, skip)` (an indented tree, plus `NL_NEW`) and `wpPick(value, who)`, which asks for a new place's name.
  - The Tracker's NPC rows have `[data-npcplace]`; `+ Add NPC` on a place tab files the new NPC there.
- **The tab:** `#view-world` (`renderWorld(treeOnly)`, state `W.sel/open/q`). The tree is `worldTreeHTML(counts)`, with counts that include NPCs inside. The page is `worldPlaceHTML(p, groups)`: name, type, Inside, campaigns, description, read-only Lore sections, picture link, places inside, NPCs here (grouped by sub-place), "Move an NPC here" (`[data-w-move]`) and delete.
  - Buttons are `[data-w]` = sel, tog, new, child, npc, opennpc, del. Fields are `[data-wf]`, saved on input and synced out on change.
  - `wpDelete` moves the places inside up a level, moves its NPCs to the parent (or no place), and removes the linked Lore entries, so `worldAdopt` won't bring the place back.
  - `"world"` is in `route()`'s views and the portal's `ALL_VIEWS` (DM only).
- **MythWeaver nesting:** the export has no parent field, so `wpNestGuess()` (run at the end of `worldAdopt`) guesses one for World places with `mwId`, no parent, and no `nestTried`. Each place is tried once and then gets `nestTried`, so a DM's move to the top level sticks.
  - It looks in this order: a tag equal to another place's name; then a Location/Region/Part of section naming one; then "in/within/inside/of/beneath/under X" in the first two sentences of the description ("near" and "outside" don't count). A leading "The" is optional in names.
  - Only a bigger place can hold a smaller one (`WP_SIZE`: region 0 … tavern/shop/temple 5; an "other" place can go inside any typed place). The most specific candidate wins, and `wpUnder` blocks cycles.
  - In `worldAdopt`, a tag sets the type only when it's a single word ("Region", "Tavern"), so a tag like "Sword Coast" doesn't make a town Wilderness.
- **Place maps:** `p.map` is a saved map entry, the same shape as a campaign's `c.maps` item: generated settings, or `imgRecord` with the picture in `MAPIMG`, plus fog, found and tokens.
  - `mapEntryNow()` builds it from the map on screen, taking fog from `HOST` if this map is hosted, otherwise from the fog store. `#mapSave` uses it too.
  - On the place page, the "Map" section (`#wpMapView`, drawn by `wpMapThumb`) has buttons `[data-w]` = openmap (`wpMapOpen`: sets `MAPLINK.place`, then `mapOpenSaved`), rmmap, usemap and genmap (`setMapForm` with the place's name and `WP_MAP_THEME[type]`, then `renderMap`). The `#wpMapFile` upload runs `imageMapBuild` and saves `imgRecord`.
  - On the Dungeon Map tab, `#mapPlace` + `#mapSavePlace` save `mapEntryNow()` to a place (`mapPlaceFill`, refreshed by `route` for `#map`). `MAPLINK.place` preselects the place the map was opened from.
  - `mapImgTidy(imgId)` deletes a picture once no World place or campaign map uses it (on Replace, Remove and place delete).
- **The side list:** `W.view` is "type" (groups from `WP_PLURAL`, open state in `W.openT`, buttons `[data-w="tgroup"]`) or "tree" (the nesting). `W.camp` (`#worldCamp`) filters to `wpCampSet(campId)`: places in that campaign's Lore plus everything inside them.
- **World builder:** `W.mode = "build"` shows `wbHTML()` in `#worldMain`. `W.build = {kind, seed, o, parent, camp}`; `wbStart(kind)` resets it.
  - `WB[kind](rng, o)` returns a draft tree `{name, type, desc, sections, kids, npcs, shop?, map?}`. The kinds are settlement (it calls tavern, shop and temple for its places, inside districts for a city), tavern, shop (`shopMake`, stored as `p.shop` params), temple and dungeon (`p.map` generated settings). Tables are the `WB_*` constants.
  - Options are `[data-wb]` (name, the kind's selects, checkboxes; parent and camp live on `W.build`). Buttons: `[data-w]` = build, wbkind, wbroll, wbadd.
  - `wbCommit()` makes the places with `wpNew`, and NPCs as `{lib, placeId, place, notes: npcText}` in the chosen campaign or the loose list. It puts the top place in the campaign's Lore with `wpSetCamp`.
  - A place with `p.shop` shows "🛒 Open the shop" (`[data-w="openshop"]`: `IT.shop = shopMake(p.shop)`, then the Items tab).
- **Campaign files:** `campExtras(c)` adds `world`: the places the campaign uses, plus their ancestors. `campExtrasAdopt` merges them by id or name and remaps parents.
- **Tests:** `npm run test:world` (`test/e2e/world.cjs`).
