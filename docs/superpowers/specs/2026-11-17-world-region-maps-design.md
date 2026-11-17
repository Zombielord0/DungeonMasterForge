# World and region maps: design (2026-11-17)

## Intent
The DM builds a world on the World tab: regions, cities, towns, villages, dungeons, landmarks. Today those places have no position. The owner wants the Forge to **draw a map of each region and place those locations on it**, for two uses:
- the DM's own planning, seeing every place;
- **showing the players on the TV**, where places the party hasn't found yet are hidden.

## Decided with the owner
- **A map per region** (approach B), plus a **world map** above the regions. Clicking a region on the world map opens its map.
- **Look: "Painted atlas"** (mockup B): blue sea with lighter shallows, green lowlands, yellow-green and brown hills, white peaks, dark-green forest dots, blue rivers, white labels with a dark halo, a compass. One look everywhere, on the DM's screen and on the TV.
- **Hidden places:** the land is always fully visible to players. Only the pins (and their names) of places the party hasn't found are left off the TV picture. The DM sees them dashed and greyed.
- **One campaign per world** (owner, 2026-11-17): "found by the players" is one flag per place, no campaign picker.
- **Import a map** (owner, 2026-11-17): a region (or the world) can use the DM's own picture (Inkarnate, Wonderdraft, a book scan) instead of generated terrain, with the same pins, reveals and TV.
- Behaviour as played back and approved: "Make a map" on a region with a few shaping choices and 🎲 Roll again; automatic first placement that the DM drags to adjust; new places pinned automatically; Reveal/Hide per pin and on the place page; new places start hidden; 📺 Show on TV with pings; the Forge names the biggest land features, and the DM can rename them.

## Goals
- Generate a good-looking, varied region map in under a second, the same every time for the same roll.
- Pin every mappable place inside the region at a believable spot, and let the DM move pins.
- Show a player-safe picture on the TV that never contains hidden places or anything DM-only.
- Keep it in sync with everything the World tab already has: account saving, backups, campaign files.

## Non-goals (for now)
- The players' Journal showing the map (a natural follow-up).
- Fog over unexplored land, travel distances, scale bars in miles, roads.
- Maps for places inside settlements (districts, inns, shops, buildings, temples): settlements keep their existing dungeon-style map.
- Hand-painting terrain.

## Anti-goals
- A hidden place, its name, its notes or anything DM-only reaching the TV, by any route.
- Changing what an existing map looks like after an update, or after the DM edits unrelated places. Maps stay reproducible from their roll.
- Making the World tab slower to open when there are no maps.

## Constraints
- Vanilla JS in `src/app/` (a new file, e.g. `06b-atlas.js`, after `06-npcs-world.js`), drawn on `<canvas>`, no libraries.
- World places live in `W.places` (localStorage `dmforge.world.v1`), saved to the DM's account as the `world` doc and in backups. The map data must live there, and stay small (bytes, not megabytes).
- World places are shared by every campaign in the app, but the owner runs one campaign per world, so "found" is stored once per place.
- The TV receives finished pictures only (`HOST`, `hostFrameCanvas`, `BroadcastChannel`); never map data.
- Seeded randomness through `makeRng(...)`, as the dungeon generator does.

## Approaches considered
1. **Draw from a recipe (chosen).** Save the roll, the shaping choices, pin positions, feature names and what was found; redraw on demand. Tiny, so it syncs and backs up with the World, and any number of maps cost nothing.
2. **Save each map as a picture** (like imported dungeon maps in IndexedDB). Simpler TV path, but 1 to 3 MB per map, and pictures don't go to the account, so maps would be stuck on one computer.
3. **Uploaded picture with pins.** Not the main approach, but the owner asked for it as well: it is built on top of approach 1 as "Import a map" (below).

## Design

### Data
On a region place (`type: "region"`), and once for the whole world in `W` (saved alongside `places` in `dmforge.world.v1`):
```
atlas: {
  v: 1,
  seed: "…",                       // the roll
  shape: "coast" | "inland" | "island",
  land: "balanced" | "mountains" | "forest" | "plains",
  pins: { [placeId]: { x, y } },   // fractions 0..1 of the map
  names: [{ id, kind: "mountains"|"forest"|"river"|"sea"|"lake", name, x, y }],  // generated, renamable; [] = none
  img: "atlas-<id>"?,               // an imported picture (IndexedDB MAPIMG) used instead of generated terrain
  imgW, imgH                        // its size, for the shape of the map
}
place.found = true                  // the players have found this place (one campaign per world)
```
Generated terrain is never stored. It's rebuilt from `seed`, `shape` and `land`.

### Import a map
- On a region's Map section and in the map view: **⬆ Import a map** (a picture file). It's shrunk to at most 4096 px (`loadImageCanvas`) and kept in IndexedDB (`MAPIMG`, key `atlas-<region id or "world">`), like imported dungeon maps and NPC pictures.
- The map is then the picture instead of terrain. Pins, reveals, dragging, region areas and the TV work the same. Shape/Land/Roll and feature names are hidden for an imported map, and starting spots are spread evenly on the picture (it has no terrain to read).
- **Use generated terrain** switches back (the picture is deleted once nothing uses it).
- The picture is on this device only, as with imported dungeon maps: it's in 💾 backups but not in account saves. On another device, the map view says "This map's picture is on another device" with Import again. The pins and reveals still sync.
- Accepts what the browser can read: PNG, JPEG, WebP.

### Which places a map shows
- A region's map shows the places **inside it** (`wpUnder`), down to settlements: city, town, village, dungeon, landmark, wilderness, other. It does not show places inside a settlement (district, building, tavern, shop, temple) or inside a dungeon.
- A **region inside the region** shows as a labelled area (its name, written large across its part of the map), not a pin. Clicking it opens that region's own map, if it has one.
- The **world map** shows the top-level regions as labelled areas, plus any top-level settlements and dungeons that aren't inside a region.

### Generating
- A height field from seeded value noise (several octaves), shaped by `shape`: an island falls off toward every edge; coast toward one or two edges (seeded); inland has no sea (lakes only). `land` shifts how much is high ground and how wet it is.
- Rivers flow downhill from high ground to the sea or a lake, joining when they meet. Lakes fill local hollows.
- Mountains are drawn as small peak marks where it's high; forests as tree dots where it's wet and low; colours by height as in the mockup, with light hill shading.
- Feature names: the largest mountain area, forest, river and sea or lake get names from a seeded name table (e.g. "the Greyspine", "Mirkwood Deep", "River Ash", "the Sapphire Bay"). The DM can rename or delete them.
- Drawn at 1600 × 1100 for the DM and the TV, scaled to fit on screen. The terrain is cached per map, so redrawing pins doesn't redo the terrain.

### Placing pins
- When a map is made, and whenever a place inside the region has no pin yet (new place, World builder, import), it gets a starting spot. Each place type has preferences, scored over many candidate spots:
  - city: low land near the coast or a river;
  - town: near a river or road-like lowland;
  - village: lowland, near water;
  - dungeon: hills or mountains;
  - landmark: hills or near water;
  - wilderness: forest.
  - All of them stay on land, keep a minimum distance from other pins, and avoid the map edge.
- A place nested under a settlement-level place sits near its parent; sub-regions get an area of the map.
- The DM drags a pin to move it. That's saved, and re-rolling the terrain keeps manual positions but nudges any pin that ends up in the sea back onto land.

### On the World tab
- A region's page gets a **"Map" section** (where place maps already show): **🗺️ Make a map** when there's none; otherwise a preview and **Open map**.
- The **map view** is a large canvas filling the main panel, with a toolbar:
  - Shape and Land choices and 🎲 Roll again, with a confirm if the map already has pins the DM placed;
  - ⬆ Import a map / Use generated terrain;
  - 📺 Show on TV / Off TV;
  - Rename features;
  - Back to the place.
- **The DM's view** shows every pin. Places the players haven't found are drawn dashed and greyed.
  - Click a pin: a small menu with Open place, Reveal to players / Hide, and Remove from map.
  - Drag a pin to move it.
  - Hover shows the name.
  - Click a region area: open its map.
- The **world map** is reached from a "🌍 World map" button at the top of the World tab's side list.
- A place's page gets a **"Found by the players"** tick, the same flag as Reveal on the map.
- New places start hidden. Revealing a place also reveals the regions above it on their maps, so the party knows which region it's in.

### On the TV
- `HOST.show = "atlas"` with `HOST.atlas = { mapId }` (a region id or "world"). `hostFrameCanvas` draws the player version: the same terrain and feature names, with pins only for found places, and region areas only for found regions.
- No notes, no hidden names, no DM-only data. The picture is drawn from the place list filtered to the found ones, so hidden names never enter the TV picture.
- Starting it uses `hostStart()` as other TV features do. While it's showing, clicking the DM's map sends a ping. Changing a pin or a reveal re-sends the picture. Turn order (`HOST.enc`) still draws its strip on top, as on dungeon maps.

### Fitting in with the rest
- Account saving, backups and campaign files already carry `W.places` and the world doc. `campExtras` must include the world-level map only if one of the campaign's places is on it (decide in the plan; it's small either way).
- Deleting a place removes its pin. Deleting a region removes its map. Moving a place to another region moves its pin to the new region's map (a new starting spot).
- MythWeaver import and the World builder create places; they get pins next time their region's map is opened.

## Left to the builder
- The exact noise settings, colours and peak and tree marks (match the approved mockup's "Painted atlas").
- The name tables for features.
- How the region-area label is laid out (a large spaced-out name along the area, e.g. a Voronoi cell around the region's centre point).
- The pin icons (the World tab's type icons are fine).
- The DM map view's layout on phones (the DM runs the map on a laptop, so phones only need to work, not shine).

## Tests
`npm run test:atlas`:
- the same roll gives the same picture;
- every mappable place gets a pin on land;
- DM drags persist;
- the TV picture contains only found places (check the place names drawn, and that hidden ones are absent);
- reveal and hide;
- an imported picture replaces the terrain, keeps its pins, goes to the TV, and survives a reload;
- the world map shows regions and opens a region's map;
- it survives a reload, account sync and a backup.
