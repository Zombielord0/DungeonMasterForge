# World and region maps (2026-11-17)

A painted-atlas map per World region, plus one for the whole world, with the World tab's places pinned on it. Places the players haven't found are left off the TV. Design: `docs/superpowers/specs/2026-11-17-world-region-maps-design.md`. Plan: `docs/superpowers/plans/2026-11-17-world-region-maps.md`. Code: `src/app/06b-atlas.js`.

## Data
- A region's map is `place.atlas`. The world map is `W.atlas`, saved next to `places` in `dmforge.world.v1` (`worldLoad` / `worldSave`). Both are:
  `{ v: 1, seed, shape: "coast"|"inland"|"island", land: "balanced"|"mountains"|"forest"|"plains", pins: { placeId: { x, y, m? } }, names: [{ id, kind, name, x, y }], off?: [placeId], img?, imgW?, imgH? }`
  - Pins are fractions of the map, saved at the centre of their land cell. `m` marks a pin the DM dragged.
  - `off` lists places taken off the map.
- **Found by the players:** `place.found = true` (one campaign per world). `atlasFound(p, on)` also reveals the regions above.
- Terrain is never stored: `atlasTerrain({ seed, shape, land })` rebuilds it (a 400 × 275 grid, cached), the same every time.
- Sync and files:
  - The world doc goes to the DM's account. `CLOUD_LISTS.world.make` keeps the first `atlas` it's given, so merges don't drop the world map.
  - Backups include the world key and the imported pictures.
  - Campaign files carry region maps inside their places, plus `worldMap` when the campaign uses a top-level region. `campExtrasAdopt` remaps pin keys for places matched by name.

## Drawing (`atlasDraw(cv, m, o)`)
- 1600 × 1100, or an imported picture's shape with its long side at 1600.
- The look is "Painted atlas":
  - colours by height, with hill shading;
  - a marching-squares coastline;
  - rivers that widen downstream;
  - forest dots, and peaks that are snow-capped above 0.5;
  - a compass.
- Names are laid out to avoid pins and each other. A pin near the right edge has its name on the left.
- `o.pins` come from `atlasPins(id, player)`. With `player`, places not found are left out, so their names are never drawn. Region areas are drawn as large spaced names.
- It returns `{ labels }`, every name drawn. The tests read `ATLAS_VIEW.labels` and `atlasTvLabels()`.

## Which places a map shows (`atlasPlaces(id)`)
- **A region's map:** everything inside it of type city, town, village, dungeon, landmark, wilderness and other. Places inside a sub-region are included. It doesn't look inside settlements and dungeons, so inns, shops and districts aren't pinned. Sub-regions are areas.
- **The world map:** top-level regions as areas, plus top-level mappable places.
- `atlasPinsFill(id)` places missing pins and drops pins of places no longer listed. It runs whenever a map is opened, so new, moved and deleted places sort themselves out.
- Starting spots (`atlasLikes`):
  - cities near water (`atlasWaterDist`);
  - dungeons high up;
  - wilderness in forest;
  - all on land;
  - at least 0.1 apart, and 0.16 for a region's name.
- `atlasReroll(id, { shape, land })` keeps dragged pins, moving any that land in the sea (`atlasToLand`), and places the rest again.

## On the World tab
- **A region's page** has a "Region map" section, with a preview (`#atlasThumb`) and "Open the region map", or "Make a map". The side list has "🌍 World map". Places have a "Found by the players" tick (`[data-wfound]`).
- **Region builder (2026-11-18):** the World builder's `region` kind (`WB.region`) makes a region with its map in one go. The draft's `atlas` uses seed `"at-" + W.build.seed`, so the preview only changes on 🎲 Roll again. Options: Name, `shape`, `land`, Inside, Add to campaign. `o.names` holds the DM's own feature names by feature id: boxes `[data-wbname]` are updated on input, redrawing only `#wbMapCv` (`wbMapDraw`). They're cleared on Roll again and Add. `wbCommit` copies `atlas` onto the new place; pins fill in when the map is first opened.
- **The map view** is `W.mode = "atlas"` with `W.atlasId`, rendered by `atlasViewHTML()` and `atlasRender()`.
- **Its controls:**
  - Shape and Land selects (`[data-at-shape]`, `[data-at-land]`) and 🎲 Roll again;
  - ⬆ Import a map (`#atlasFile`) and Use generated land (`[data-at="gen"]`);
  - 📺 Show on TV;
  - feature names in text boxes (`[data-atname]`).
- **On the canvas** (`#atlasCv`):
  - press a pin and drag to move it;
  - click a pin for `#atlasMenu` (`[data-atp]` = reveal, hide, map, open, remove);
  - on the world map, click a region's name to open its map;
  - while the map is on the TV, click empty land to ping.

## Import a map
- `atlasImport(id, file)` stores the picture in `MAPIMG` as `atlas-<id>`, shrunk to 4096 px, and sets `m.img`, `imgW` and `imgH`. Pins are kept.
- For a picture map, Shape, Land, Roll and feature names are hidden.
- Without the picture on this device, `#atlasMissing` explains, and a plain stand-in shows the pins.
- `atlasUseGenerated(id)` deletes the picture and moves pins onto land. Deleting a region deletes its picture.

## On the TV
- `atlasTv(id)` toggles `HOST.show = "atlas"` and `HOST.atlas = { id }`, starting the TV if needed. `hostFrameCanvas` draws `atlasTvCanvas()`, the player version, with the turn order strip when a fight is on the TV.
- The picture is re-sent on any change to that map or a reveal. The Dungeon Map tab's "Back to map" switches the TV back.

## Tests
`npm run test:atlas` (`test/e2e/atlas.cjs`) covers:
- the same recipe giving the same picture;
- shapes and lands;
- rivers ending in water;
- pins on land and spaced out;
- what each map lists;
- re-rolls;
- saving, backup, sync merge and campaign files;
- the view: make, drag, reveal, the menu near the edge, roll, rename, the world map, phone width;
- import, including a missing picture and switching back;
- the TV: no hidden names, reveal re-sends, pings, and imported maps.
