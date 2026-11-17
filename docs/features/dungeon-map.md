# Dungeon Map and the TV

Code: `src/app/03-dungeon-map.js` (and `public/player.html` for the TV window).

Moved here from `CLAUDE.md` on 2026-11-17, unchanged except that `public/index.html` now means the files in `src/app/` (see "How the page is built" in `CLAUDE.md`).

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

## Map rooms to encounters (2026-11-15)

- **The button.** `roomKeyHTML` and `imageKeyHTML` add `mapRunBtn(i)` under any room with an `enc`.
- **What it does.** `mapRunEncounter(i)` parses `o.enc.text` with `parseEncText` and adds a `kind:"map"` encounter to the campaign picked in `#mapCampaign` (`curCampForMap()`).
  - While hosting, it also reveals the room (with an undo snapshot) and sets `HOST.enc` so the turn order shows on the TV.
- **Tests:** `npm run test:mapenc` (`test/e2e/map-enc.cjs`).

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
