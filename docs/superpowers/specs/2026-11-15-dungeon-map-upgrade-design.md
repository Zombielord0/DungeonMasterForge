# Dungeon Map upgrade: visuals, import/export, and a player screen with fog

Status: draft, waiting for the owner's approval
Date: 2026-11-15

## Why

The owner has finished a long run of character-sheet work and wants the Dungeon Map tab to catch up. Today it generates a good dungeon and room key, but:

- The maps look plain, and every theme looks almost the same. Caverns come out as blocky stair-step shapes.
- A DM can't bring in a map made somewhere else (Dungeondraft, Dungeon Scrawl, a published adventure, a scan).
- There's no way to show the map to players while hiding the parts they haven't explored.

Success means a DM can run a session from the Forge: pick or import a map, put a player screen on a TV or second monitor, and reveal rooms as the party explores. None of that should use Netlify during play.

## Goals

1. **Visuals.** Each theme has its own look. Caverns get natural walls. The map has a hand-drawn ink style, room furniture that matches the key, and three style presets.
2. **Interactive map.** Hovering or clicking a room highlights its key entry, and large maps can be zoomed and panned.
3. **Player-safe download.** A second PNG with traps, secret doors and DM-only labels removed.
4. **Import.**
   - Bring in your own map image and place numbered room markers on it.
   - Import Universal VTT files (`.dd2vtt`, `.df2vtt`, `.uvtt`).
5. **Export and share.**
   - Save and load a Forge map file (`.forgemap.json`).
   - Export a generated map as Universal VTT for Foundry and other VTTs, and as a PNG sized for Roll20.
6. **Player screen with fog (option 1, same room).** The DM opens a second window for the TV and controls what it shows. Nothing goes over the internet.

## Non-goals

- Remote players on their own devices. That's option 2 (direct browser-to-browser connections), a possible later project.
- Tokens, initiative, measuring or line-of-sight on the map.
- Editing a generated map's layout or rewriting its room key text.
- Applying style presets to imported images. An imported map is a picture and stays as drawn.

## Anti-goals (it fails even if it works)

- Any Netlify function call during play. Fog, pings and the player screen must stay inside the DM's computer.
- The player screen receiving hidden information. It must never get trap locations, secret doors, unrevealed areas or the room key, even in its page data. A player looking at the TV laptop's developer tools should learn nothing.
- Breaking saved maps. A map saved before this work must open with the same rooms, doors and contents, using the same seed.
- Large images bloating the synced campaign data, or exceeding the browser's ~5 MB localStorage limit.

## Constraints

- The app is one page (`public/index.html`) of vanilla JS with global functions. New map code lives there in the same style. There's no new framework and no build step for the page itself.
- It has to work in "Use without an account" mode and when signed in.
- It has to work on Windows browsers (Chrome and Edge first, then Firefox).
- Visuals are drawn in code on the canvas, with no downloaded image or texture files, so the app keeps working offline and stays a single page.
- Work happens on the development branch and is tested with `npm run dev`. Nothing is merged to `main` without the owner asking.

## Approaches considered (for the player screen)

| Option | How it works | Netlify use | Trade-off |
| --- | --- | --- | --- |
| **1. Second window (chosen)** | The DM's window opens a player window on the same computer; they talk through the browser's built-in channel | None | Players must be in the room |
| 2. Direct browser-to-browser | Netlify introduces the browsers once, then data flows directly | A handful of calls per session | Some networks block it; the DM's browser must stay open |
| 3. Netlify update checks | Players check the server every few seconds | ~19,000 calls for a 4-hour session with 4 players | Simple to build but expensive |

The owner picked option 1 to avoid Netlify use. Option 2 remains open for later.

## Design

### Phase 1: Visuals and interaction

**The same seed still gives the same dungeon.** `generateDungeon` keeps its random sequence exactly as it is now. Everything new (furniture placement, wobbly ink lines, cave wall shapes, textures) uses its own random stream, for example `makeRng("dress", seed, ...)`, so adding it can't shift the rooms. A test checks that a fixed set of seeds produces the same rooms, doors and key text as before the change.

**Theme looks.** These are drawn floor patterns, each with its own palette:

| Theme | Floor | Extras |
| --- | --- | --- |
| Crypt | Flagstones | Rows of burial niches along some walls |
| Cavern | Rough rock with speckles | Rubble at the edges |
| Keep | Wooden planks in rooms, stone in corridors | |
| Sewer | Stone | A water channel down the middle of corridors |
| Temple | Tiles, with a mosaic in the largest room | |
| Mine | Packed earth | Cart tracks along some corridors, support beams |

**Natural cave walls.** For caverns, the outline is traced around the floor squares and then smoothed and roughened into an organic shape. The game grid stays square: the outline is just drawn over the squares.

**Hand-drawn style.** Walls are drawn as slightly uneven double ink strokes. The paper gets a grain texture and a darker edge vignette. Hatching is drawn as hand-style strokes instead of the repeating tile. These effects only apply in the Parchment and Classic blue styles.

**Room furniture.** Each room type maps to a set of drawn props, for example:

- Ossuary: bone piles.
- Embalming chamber: tables.
- Underground pool: water.
- Armory: weapon racks.
- Library: shelves.
- Altar rooms: an altar.
- Mine rooms: carts and barrels.

Props are placed away from doors, the room number, the chest, trap and stair icons, and the straight walking line between doors. Some rooms stay mostly empty so the map isn't cluttered. There's one small set of drawing functions per prop.

**Style presets.** A new "Style" dropdown on the map form has three choices:

- **Parchment:** the current look, upgraded.
- **Classic blue:** old-school blue-on-white graph paper, with flat floors and no texture.
- **Dark VTT:** dark surroundings and textured floors for screens, no paper effect.

The chosen style is saved with the map.

**Interaction.**

- Hovering a room on the canvas outlines it and highlights its entry in the Room Key.
- Clicking a room scrolls the key to that entry.
- Hovering a key entry highlights the room.
- The mouse wheel or the + and − buttons zoom the map, dragging pans it, and a "Fit" button resets the view.

The canvas is redrawn at the zoom level so it stays sharp, rather than being stretched with CSS.

**Player-safe download.** A "Download player map" button produces a PNG with these changes:

- Secret doors are drawn as plain wall.
- Trap icons are removed.
- The boss room's red marker and the stairs "down" icon are hidden.
- The header shows only the map name, with no seed and no party level.
- Room numbers are kept, because players often refer to them.

### Phase 2: Import and export

**Where imported images are kept.** They go in the browser's IndexedDB, which allows hundreds of MB, rather than localStorage. On import, an image is scaled down so its longest side is at most 4096 pixels. The campaign's saved-maps list stores only a small record: name, the local image's id, grid settings, markers and key. If that campaign is opened on another computer, an imported map shows "Image not on this device. Load the map file." This keeps images out of Netlify entirely.

**Import a map image (PNG, JPG, WebP).**

1. The DM chooses a file and gives the map a name.
2. **Grid setup.** The DM sets the size of one square, either by typing how many squares fit across or by dragging over one square on the image. Grid lines are shown over the image so the DM can check they line up, and the grid can be nudged with an offset.
3. **Room markers.** In "Place rooms" mode, each click drops the next number. Markers can be dragged and deleted, and numbers close up after a deletion.
4. **Room key.** Each marker gets a key entry with a name and notes the DM can edit. A "Roll contents" button on an entry fills it using the existing generator (encounter, trap, treasure or empty), based on the party level and size and a theme the DM picks for the imported map.

**Import Universal VTT (`.dd2vtt`, `.df2vtt`, `.uvtt`).**

- The map image and its grid size (`pixels_per_grid`) are read from the file, so the grid lines up automatically.
- Walls and doors in the file are kept with the map. Phase 3 uses them for "Reveal area".
- The imported map then works like an imported image: the DM adds markers and a key.

**Forge map file (`.forgemap.json`).**

- "Export map file" saves a single JSON file:
  - Generated maps: settings, seed, style, fog and found secret doors.
  - Imported maps: also the image (embedded as data), grid, markers and key.
- "Import map file" loads it back, including on another computer. This is the way to share a map with another DM or move it between devices.

**VTT export for generated maps.**

- "Export for Foundry and other VTTs (.dd2vtt)" saves the map image at 100 pixels per square, plus walls built from the wall edges and doors as portals. Foundry needs a free Universal VTT importer module to read this file; the button's help text says so.
- "Download for Roll20" saves a PNG at 70 pixels per square, Roll20's default, with the grid off.

### Phase 3: Player screen and fog (same room)

**Opening it.** A "Host for players" button opens a new window, `public/player.html`, which the DM drags onto the TV or second monitor and makes full screen. If the browser blocks pop-ups, a notice explains how to allow them.

**The player window shows only pictures.** `player.html` is a tiny page with no app code, no sign-in and no map data. The DM's window draws the player picture itself (fog applied, hidden things removed) and sends it as an image through the browser's built-in `BroadcastChannel`. This satisfies the "player screen learns nothing" anti-goal. If the player window is reloaded, it asks for the current picture and gets it. If the DM's window closes, the player screen shows "Waiting for the DM…".

**Fog tools (DM window).**

| Tool | What it does |
| --- | --- |
| **Reveal room** | Click a room to reveal it, its doors and the corridor squares that touch it. On imported maps with UVTT walls, it reveals the area enclosed by walls around the click, up to a size limit. |
| **Brush** | Paint to reveal or to hide, in 1×1, 3×3 or 5×5 squares. |
| **Rectangle** | Drag a box to reveal or hide it. |
| **Reveal all / Hide all** | Reveals or hides the whole map. |
| **Undo** | Undoes the last fog change. |

- Fog works square by square on the map grid.
- In the DM window, fog shows as a dark see-through tint, so the DM can still read everything. The player window shows it as solid darkness that matches the style.
- **Secret doors** appear as wall on the player screen until the DM clicks one in "Mark secret door found" mode.
- **Traps** never appear on the player screen.
- **Room numbers** on the player screen are off by default, with a toggle.
- **Ping:** holding Shift and clicking flashes a ring at that spot on the TV, to point something out.
- The player screen always fits the whole map to the screen. Following the DM's zoom is left for later.

**Saving fog.** During play, fog progress is saved automatically on this computer (in IndexedDB, under the map's id). It goes into the campaign only when the DM presses Save, so play itself never triggers a Netlify call. Fog is stored compactly, as run-length encoded squares, so a saved map stays small.

### Map form layout (sketch)

```
┌ Map ─────────────────────┐   ┌ canvas (zoom/pan) ───────────────┐
│ Name  [The Forgotten…]   │   │ [−][+][Fit]                       │
│ Theme [Crypt ▾] Style [Parchment ▾] │                            │
│ Size / Rooms / Level / Party        │                            │
│ [🗺 Generate Dungeon]     │   └───────────────────────────────────┘
│ Import: [Image] [VTT file] [Map file]                            │
│ Export: [PNG] [Player PNG] [Map file] [VTT] [Roll20]             │
│ Save to campaign [▾][Save]│   ┌ Host ─────────────────────────────┐
│                           │   │ [Host for players]  ● TV connected│
└───────────────────────────┘   │ Fog: (Room)(Brush)(Box) Reveal/Hide│
                                │ [Reveal all][Hide all][Undo] ☐ numbers│
                                └───────────────────────────────────┘
```

The exact layout follows the existing form and card patterns in `index.html`.

## Testing

- Playwright checks run against `npm run dev` in offline mode:
  - The same-seed regression set.
  - Each theme and style renders without errors.
  - Hover links a room and its key entry.
  - Import an image and place markers.
  - Import a sample `.dd2vtt`.
  - A map file survives a round trip (export, then import).
  - The player window receives only image messages.
  - A revealed room appears on the player screen and a hidden one doesn't.
  - Fog survives a page reload.
- `npm test` (the API tests) still passes. No API changes are planned.
- Screenshots of each theme and style are taken for the owner to check in the browser.

## Rollout

- Phases ship in order (1, 2, 3), each on the development branch.
- The owner tests each phase locally with `npm run dev`, which works on Windows, before the next one starts.
- Nothing is merged or pushed to `main` until the owner asks. That means one Netlify production build at most, when they choose.
- No pull request is opened unless asked.
- `CLAUDE.md` gets a "Dungeon Map" section after each phase.

## Calls made by Claude (owner may override)

- Visuals are drawn in code, not image textures, to keep the app offline-capable and one page.
- Existing seeds must reproduce existing maps exactly.
- Imported images stay on the DM's computer. They're shared only through map files, never through Netlify.
- Images are capped at 4096 pixels on the longest side.
- The player window only receives finished pictures.
- Fog works on whole squares.
- Room numbers are off on the player screen by default; secret doors are hidden until marked found; traps are never shown.
- Fog goes into the campaign only on Save.
- VTT export uses 100 px per square for the `.dd2vtt` file and 70 px per square for Roll20.
- Tokens, remote play, and editing generated layouts are out of scope.

## Left to the builder

- The exact prop artwork and the room-type-to-prop table.
- The smoothing method for cave walls.
- Zoom limits.
- The maximum area for wall-based "Reveal area".
- How to lay out the new buttons within the existing form patterns.
