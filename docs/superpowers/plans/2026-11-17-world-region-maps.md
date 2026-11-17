# World and Region Maps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A painted-atlas map per World region and one for the whole world, generated from a saved recipe or imported as a picture, with the region's places pinned on it, revealed to the TV as the party finds them.

**Architecture:** A new code file `src/app/06b-atlas.js` (joined after `06-npcs-world.js`) holds the terrain generator, the renderer, pin placement, the World-tab map view and the TV hook. Map data lives on region places (`p.atlas`) and, for the world map, in `W.atlas`, both saved in the existing world doc, so account sync, backups and campaign files carry them. Terrain is never stored; it's rebuilt from the seed.

**Tech Stack:** Vanilla JS on `<canvas>`, Playwright checks (`test/e2e/atlas.cjs`).

**Spec:** `docs/superpowers/specs/2026-11-17-world-region-maps-design.md`

## Global Constraints
- Look: "Painted atlas" only: blue sea with lighter shallows, green lowlands, yellow-green then brown hills, white peaks, dark-green forest dots, blue rivers, white labels with a dark halo, a compass.
- One campaign per world: "found" is `place.found = true`; no campaign picker.
- The TV gets finished pictures only; a hidden place's name must never be drawn on the TV picture.
- Seeded randomness only (`makeRng(tag, seed)`); the same recipe draws the same map, always.
- Mappable on a map: `city, town, village, dungeon, landmark, wilderness, other` inside it; `region` inside it shows as a labelled area; nothing under a settlement or dungeon.
- Imported pictures: `MAPIMG` key `atlas-<region id>` or `atlas-world`, shrunk with `loadImageCanvas` (4096 px max); on this device only (in backups, not account saves).
- New places start hidden (no `found`).

## Review Focus
- A region with no mappable places: the map still makes and shows, with no pins.
- A pinned place later moved to another region or deleted: its pin disappears from the old map, with no error.
- Re-rolling the terrain after the DM moved pins: manual pins stay; any now in the sea move to the nearest land.
- Opening an imported map on a device without its picture: a clear message and Import again, pins still listed.
- A very small window (phone width): the map view still fits and pins can still be tapped.

---

### Task 1: Terrain and drawing

**Files:**
- Create: `src/app/06b-atlas.js`
- Test: `test/e2e/atlas.cjs` (static server pattern as `test/e2e/world.cjs`), `package.json` script `test:atlas` = `node tools/build.mjs --quiet && node test/e2e/atlas.cjs`

**Interfaces:**
- Produces:
  - `const ATLAS_W = 1600, ATLAS_H = 1100`;
  - `atlasTerrain(m)`, where `m = {seed, shape, land}`, returns `{W: 400, H: 275, h: Float32Array, wet: Float32Array, rivers: [[[x, y]…]], lakes: [{x, y}], feats: [{kind, x, y}]}`. It's cached by `seed|shape|land` (keep the last 6), and x/y are grid cells.
  - `atlasDraw(cv, m, o)` draws at `ATLAS_W × ATLAS_H` × `o.scale || 1`. `o.pins = [{name, icon, x, y, hidden?, area?}]` with fractions; `o.player` leaves out hidden pins; `o.names` is the feature labels. It returns `{labels: [string…]}`, every text it drew.
  - `ATLAS_SHAPES = {coast: "Coast", inland: "Inland", island: "Island"}`, `ATLAS_LANDS = {balanced: "Balanced", mountains: "Mountains", forest: "Forest", plains: "Plains"}`.
  - `atlasNames(m)` returns `[{id, kind, name, x, y}]`: names for the largest mountain area, forest, river, and sea or lake, from seeded tables `ATLAS_NAME_*`.

- [ ] **Step 1: Write the failing checks** in `test/e2e/atlas.cjs`:
  - `atlas: the same recipe draws the same picture`: `toDataURL` is equal for two draws of `{seed:"S1", shape:"coast", land:"balanced"}`, and different for `seed:"S2"`.
  - `atlas: island has sea on every edge; inland has no sea cells at all`: check `h < 0` on the border rows and columns for the island, and no `h < 0` cells for inland apart from lakes.
  - `atlas: "mountains" has more high ground than "plains"`: count `h > .45`.
  - `atlas: rivers end in sea or a lake`.
  - `atlas: feature names come back and are drawn`: `atlasNames(m).length >= 2`, and `atlasDraw(...).labels` includes them.
- [ ] **Step 2:** Run `npm run test:atlas`. Expected: FAIL, `atlasTerrain is not defined`.
- [ ] **Step 3: Implement.**
  - Value-noise fBm (5 octaves) via `makeRng("atlas", seed)` permutation tables.
  - Shaping: island subtracts a radial falloff; coast subtracts a falloff toward 1 or 2 seeded edges; inland adds a lift so there's no sea, and fills hollows below 0 as lakes.
  - `land` moves the sea level and mountain share by fixed offsets.
  - Rivers: steepest descent from high cells, as in the mockup in the spec's conversation (`scratchpad/world-map-mockups.html`). Up to 5, each at least 25 cells long, ending in sea or a lake.
  - Colours by height as the mockup's atlas style. Peaks are white-topped triangles above `.5`, brown ones above `.32`. Forest dots where wet is above `.55` on low land.
- [ ] **Step 4:** Run `npm run test:atlas`. Expected: PASS.
- [ ] **Step 5: Commit** "World maps: terrain and painted-atlas drawing".

### Task 2: Map data and pins

**Files:** Modify `src/app/06b-atlas.js`, `src/app/06-npcs-world.js` (`worldLoad`, `worldSave`, `wpDelete`), `src/app/04-storage.js` (`CLOUD_LISTS.world.make` must keep `atlas` from this browser's copy), `src/app/05-tracker.js` (`campExtras` adds `W.atlas` when the campaign uses any top-level region). Test: `test/e2e/atlas.cjs`.

**Interfaces:**
- Consumes: `atlasTerrain`, `wp`, `wpUnder`, `wpKids`, `W`.
- Produces:
  - `atlasOf(id)` (`id` is a region place id, or `"world"`) returns the map object or `null`.
  - `atlasMake(id, {shape, land})` creates `{v: 1, seed: uid("at"), shape, land, pins: {}, names: atlasNames(...)}`, stored on `wp(id).atlas` or `W.atlas`.
  - `atlasPlaces(id)` returns `[{p, area: bool}]`:
    - for a region: places inside it whose type is mappable, plus regions inside it (with `area: true`), stopping at settlements and dungeons;
    - for `"world"`: top-level regions (as areas), plus top-level mappable places.
  - `atlasPinsFill(id)` gives every listed place without a pin a starting spot, and drops pins of places no longer listed.
  - `atlasPins(id, player)` returns the `o.pins` for `atlasDraw`. A hidden pin is `!p.found`; with `player`, hidden pins are left out.
  - `W.atlas` is saved as `{places, atlas}` in `dmforge.world.v1`.

- [ ] **Step 1: Write the failing checks.**
  - `atlas: every mappable place inside a region gets a pin on land, at least 0.04 apart`.
  - `atlas: a city sits nearer water than a dungeon` (average over 5 seeds).
  - `atlas: an inn inside a city isn't pinned; a sub-region is an area`.
  - `atlas: a moved or deleted place loses its pin`.
  - `atlas: re-rolling keeps a dragged pin and moves sea pins to land`.
  - `atlas: the world map lives in the world doc, survives a reload and is in a backup`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Placement scores about 400 random land cells per place: city prefers coast or river within 3 cells; town prefers rivers; village prefers lowland near water; dungeon prefers `h > .35`; landmark prefers hills; wilderness prefers forest; `other` has no preference.
  - Penalise being within 0.06 of other pins or 0.05 of the edge.
  - Use `makeRng("pin", seed + place id)` so placement is repeatable.
  - Areas: the region's label point is placed like a pin; draw its name large and letter-spaced at that point.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit** "World maps: places pinned on region and world maps".

### Task 3: The map view on the World tab

**Files:** Modify `src/app/06-npcs-world.js` (`worldPlaceHTML`: a "Region map" section for `type === "region"` above the existing Map section, and a "Found by the players" tick `[data-wf-found]` for mappable places; `renderWorld`: `W.mode === "atlas"` shows `atlasViewHTML()`; a "🌍 World map" button in the side list), `src/app/06b-atlas.js`, `src/app.css`. Test: `test/e2e/atlas.cjs`.

**Interfaces:**
- Consumes: Task 2.
- Produces: `atlasOpen(id)` (sets `W.mode = "atlas"`, `W.atlasId`), `atlasViewHTML()`, `atlasRender()`. Buttons `[data-at]` = make, roll, back, tv, import, gen, rename. Selects `[data-at-shape]` and `[data-at-land]`. The pin menu is `#atlasMenu` with `[data-atp]` = open, reveal, hide, remove.

- [ ] **Step 1: Write the failing checks.**
  - `atlas view: a region's page offers Make a map, and the map opens with every place pinned`.
  - `atlas view: dragging a pin moves it and it stays after a reload`.
  - `atlas view: the pin menu reveals a place, and the place page's tick shows it`.
  - `atlas view: revealing a place also reveals the regions above it`.
  - `atlas view: hidden pins are drawn dashed` (the `atlasDraw` labels for the DM include hidden names; the pins have `hidden: true`).
  - `atlas view: Roll again with a new shape changes the map`.
  - `atlas view: a feature can be renamed`.
  - `atlas view: the World map button shows regions; clicking a region opens its map`.
  - `atlas view: at 390 px wide the map fits the screen`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - A canvas `#atlasCv` at `ATLAS_W × ATLAS_H`, CSS width 100%.
  - Pointer events convert to fractions. A press within 22 px of a pin starts a drag (`atlasDrag`); a click with less than 4 px of movement opens the menu.
  - When the TV is showing this map, a click elsewhere pings (Task 5).
  - Renaming a feature uses `prompt`.
  - Every change calls `worldSave()`, then `atlasRender()`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit** "World maps: the map view on the World tab".

### Task 4: Import a map

**Files:** Modify `src/app/06b-atlas.js`. Test: `test/e2e/atlas.cjs`.

**Interfaces:**
- Consumes: `MAPIMG`, `loadImageCanvas`, `mapImgTidy`-style clean-up.
- Produces: `atlasImport(id, file)` sets `m.img = "atlas-" + id`, plus `m.imgW` and `m.imgH`, and stores the picture. `atlasPicture(m)` returns `Promise<canvas|null>` (cached). `atlasDraw` uses the picture instead of terrain when `o.picture` is passed, scaled to fit `ATLAS_W × ATLAS_H` with the picture's own aspect: the canvas takes the picture's shape, with the long side at 1600.

- [ ] **Step 1: Write the failing checks.**
  - `import: a picture replaces the terrain and keeps the pins`.
  - `import: pins are placed evenly on a picture`.
  - `import: it survives a reload`.
  - `import: Use generated terrain switches back and deletes the picture`.
  - `import: without the picture on this device the view says so and offers Import again`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.** On a picture map, the starting spots are a jittered grid over the picture, and the Shape, Land, Roll and feature names are hidden.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit** "World maps: import your own map picture".

### Task 5: On the TV

**Files:** Modify `src/app/03-dungeon-map.js` (`hostFrameCanvas`: when `HOST.show === "atlas"`, draw `atlasTvCanvas()`; `handoutUI` and the Back to map button treat "atlas" like a handout), and `src/app/06b-atlas.js`. Test: `test/e2e/atlas.cjs`, using the TV pattern from `test/e2e/tv.cjs` (`window.tvFrames`).

**Interfaces:**
- Produces:
  - `atlasTv(id)` toggles `HOST.show = "atlas"` and `HOST.atlas = {id}`, and starts hosting if needed.
  - `atlasTvCanvas()` returns the player canvas (`atlasDraw(..., {player: true})`), with the turn strip on top when `hostEnc()`.
  - `atlasTvLabels()` returns the labels of the last TV picture, for tests.

- [ ] **Step 1: Write the failing checks.**
  - `tv: Show on TV sends a frame`.
  - `tv: the picture's labels include found places and feature names, and never a hidden place's name`.
  - `tv: revealing a place re-sends with its name`.
  - `tv: a click on the DM's map while showing sends a ping`.
  - `tv: an imported map goes to the TV`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.** Reveal, hide, drag and rename call `hostSend()` when `HOST.show === "atlas"` for this id.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit** "World maps: show a region on the TV".

### Task 6: Notes, What's new, full run
- [ ] Add a NEWS entry at the top of `src/app/18-news.js` (`id: "2026-11-17-world-maps"`, `go: "world"`), in plain words.
- [ ] Write `docs/features/world-maps.md`; add rows to `CLAUDE.md`'s code-file and feature tables and `test:atlas` to its command list.
- [ ] Run `npm run test:all`. Expected: every check passes.
- [ ] Commit "World maps: notes and What's new". Push the branch (one preview build for the whole feature).
