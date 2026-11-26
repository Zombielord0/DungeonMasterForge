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

## The hand-drawn looks (2026-11-24)

- **Three more Styles:** `inked` (Inked sketch), `atlas` (Old atlas) and `torch` (Stone and torchlight). Their `MAP_STYLES` entries carry `look`, and `mapBase` hands them to `mapLook` in `src/app/03b-map-looks.js`. Parchment, Blue and Dark still draw exactly as before.
- **Rough.js 4.6.6** (MIT, unchanged bundled build) is `src/app/03a-rough.js`, a global `rough`. Every line is drawn with a fixed `seed`, so a map looks the same on every redraw, and the TV matches the DM's window.
- `mapLook` draws the same layers as `mapBase`: paper or rock, hatching (`mapLookHatch`), the floor layer, the walls (`mapWallRuns`: long straight runs, drawn by Rough.js; the torch look uses a thick band with a lit edge), then the shared doors, furniture and icons (`mapDrawDoors`, `drawProp`, `mapDrawIcons`), so the player rules (traps, unfound secret doors) are the same in every look. Then:
  - Old atlas: stains and burnt edges (`mapLookLayer`: soft noise drawn small and stretched), red room numbers (`st.numBg`) and a compass rose (`mapCompassRose`) in place of the N arrow.
  - Stone and torchlight: darkness cut by torches in room corners and braziers (`mapLights`), with a warm glow.
- Style colours used by the shared drawings: `propA`/`propB` (furniture), `door` and `numBg`.
- Caves: the soft outline code moved into `mapCaveMasks(d, s, mk, ink)`, used by `mapBase` and `mapLook`.
- Checks: `npm run test:mapvis` (every look and theme draws, the same every time, floor colours, no traps in the players' picture, the Style list).

## The map editor (2026-11-24)

Design: `docs/superpowers/specs/2026-11-24-map-editor-design.md`. Code: `src/app/03c-map-editor.js` (data and drawing) and `src/app/03d-map-editor-ui.js` (the tools).
- **Drawn maps** are `kind: "drawn"`. ✏️ Edit map turns a generated dungeon into one (`drawnFromGen`: its floor and room ids as `base`, its doors, its furniture from `mapDress` as `props`, its rooms and key); New blank map starts an empty one of the chosen size (`drawnBlank`). The record (`d.rec`) is what campaigns, World places, map files and the draft keep; the fields are listed at the top of `03c-map-editor.js`.
- **`drawnRefresh(d)`** works out what the rest of the map code needs: `grid` (a square is floor when at least half of it is), `rid` (room ids: from `base`, then each drawn room shape; painted corridors are -1), `rooms` (with their sizes for the key), `doors` (`secret` from `kind`) and `params` (`seed` is the map's id). So fog, Reveal room, tokens, hovering, the TV and Run this fight work as on generated maps. `fogKey` is `drawn|<id>`.
- **Drawing** (`drawnBase`, called by `mapBase`): the floor is a mask (`drawnMask`: `base` squares, smoothed for caves with `mapCaveMasks`, then each shape filled or cut), and the walls are its outline traced at quarter squares (`drawnContours`, marching squares), so round rooms and slanted walls are smooth. Walls are Rough.js lines (seeded) when the look's roughness is on. The rest reuses the six looks: hatching, textures, paper, torchlight, doors (`mapDrawDoors`, now with `locked` and `bars`), furniture (`drawProp`, plus `drawPropMore` for the new pieces and uploaded pictures), stairs, and labels (a DM-only label is left off the players' picture).
- **Style** (`rec.look`, read by `drawnStyle`): wall colour, thickness and roughness, floor colour, grid (lines, dots, none) and hatching.
- **The tools** (`MED`): Select, Room, Round room, Shape, Paint, Erase, Erase brush, Door, Stairs, Room number, Text, Furniture (`MAP_PROPS`), Picture (kept in the `dmforge-maps` IndexedDB as `prop-<id>`, like map pictures: in backups, not in account saves). Every change goes through `medChange`, which keeps an undo copy (Ctrl+Z, Ctrl+Y). While editing, the editor's pointer handlers run first and stop the map's own (pan, hover). The editor is off while hosting for the TV.
- On a drawn map, the map form's Theme, Style, Name, Party level and Party size change the drawing (`medFormChange`); Size and Rooms don't. Generate Dungeon makes a new dungeon.
- The drawing in progress is kept in `dmforge.mapdraft.v1` (in `BACKUP_KEYS`), and "Continue my last drawing" brings it back after a refresh.
- Checks: `npm run test:mapedit` (`test/e2e/map-editor.cjs`).

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

## Your maps, Build and Run (2026-11-25)

The owner found the tab too busy and picked, from three mockups, "your maps first" with a full-screen table view. Design: `docs/superpowers/specs/2026-11-25-dungeon-map-layout-design.md`. Code: `src/app/03e-map-modes.js`. Check: `npm run test:maplayout`.
- **The modes** are classes on `#view-map`: `map-list`, `map-build` and `map-run`. The same elements are shown, hidden or placed by CSS, so fog, tokens, the TV and the editor work as before.
- **Your maps** (`mapLibRender`): every campaign's `maps` and every World place's `map`, as cards drawn by `mapThumbInto`. A picker narrows them to one campaign or World places. **✏ Edit** opens Build and **▶ Run** opens Run, through `mapOpenSaved` and `wpMapOpen`.
- **Build:** the generator form, the editor and import panels, the map and the Room key. There's no Player Screen. **← Your maps** and **▶ Run for players** sit in a bar above the map.
- **Run:**
  - a fixed full-screen grid over the header and side menu, with a bar showing the map's name, the TV state and **✕ Done**;
  - the map on the left;
  - the Player Screen card on the right, filtered by tabs (`data-rtab` on `#view-map`: TV & fog, Tokens `#tokField`, Handout `#handoutField`);
  - the Room key always under it.

  On phones it's one column. Esc or Done returns to where Run was opened from (`MAPMODE.from`). Leaving the tab leaves Run (`mapLeave` in `route()`).
- **Which mode the tab opens in** (`mapEnter`): Your maps if anything is saved, otherwise Build. Within a visit it stays where you left it. Anything that opens a particular map (`mapOpenSaved`, `imgUse`, `medOpen`, the Adventure tab's and the World's Generate a map, loading a map file) calls `mapShowBuild()` first.
