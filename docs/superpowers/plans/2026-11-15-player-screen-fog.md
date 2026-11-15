# Player Screen with Fog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The DM opens a second "player screen" window, puts it on a TV, and reveals the generated dungeon square by square or room by room. It uses no network at all.

**Architecture:** Fog is a `Uint8Array` with one byte per map square, kept beside `currentMap` in `public/index.html`. `drawDungeon` gains an options argument. With it, the same function draws the DM view (a see-through tint over fogged squares) or the player view (solid fog, no traps, no unfound secret doors, no seed). The DM window draws the player view into an offscreen canvas and posts the PNG `Blob` over `BroadcastChannel("dmforge.map")` to `public/player.html`. That page is a tiny standalone file that only shows the pictures it receives.

**Tech Stack:** Vanilla JS in the single page, Canvas 2D, `BroadcastChannel`, `localStorage`, and Playwright for tests.

**Spec:** `docs/superpowers/specs/2026-11-15-dungeon-map-upgrade-design.md` (Phase 3 only; Phases 1 and 2 get their own plans).

## Global Constraints

- No Netlify function call during play. The player screen uses no `fetch` and no API.
- The player window must never receive anything except `{t:"frame", blob}`, `{t:"ping", x, y}` (fractions from 0 to 1) and `{t:"bye"}`.
- Existing seeds must give the same map. `generateDungeon` is not changed.
- The DM sees fog as a see-through dark tint. The player sees solid fog.
- Traps never appear on the player screen. Secret doors are drawn as wall until the DM marks them found.
- Room numbers on the player screen are off by default.
- During play, fog autosaves locally. It goes into the campaign only when the DM presses Save.
- Commands the owner runs must work on Windows. Add `npm run test:map`.

**Deviation from the spec (my call):** fog autosaves to `localStorage` (`dmforge.fog.v1`), not IndexedDB. Fog for a large map is under 1 KB once run-length encoded, and IndexedDB stays reserved for imported images in Phase 2. The store is capped at the 40 most recently used maps.

## Review Focus

1. **A new map is generated while hosting.** The TV switches to the new map's own fog (fully hidden except the entrance) and never shows the old fog on new geometry.
2. **The player window is reloaded or opened before the DM picks a map.** It shows "Waiting for the DM…", then the current picture as soon as one exists.
3. **The pop-up is blocked.** The DM gets a toast saying how to allow it; nothing fails silently.
4. **The DM clicks on the margin, the header area or outside the grid.** No error occurs and the fog doesn't change.
5. **Cavern maps** (no doors, eroded rooms). "Reveal room" still reveals the whole irregular room.

---

## File structure

| File | Change |
| --- | --- |
| `public/index.html` | Fog helpers, `drawDungeon` options, the Player screen card under the map, mouse tools, broadcasting, and Save/Open of fog in campaigns |
| `public/player.html` | New: a full-screen viewer for the TV |
| `test/e2e/map-fog.cjs` | New: a self-contained Playwright test with its own static server on a free port |
| `package.json` | Add `"test:map": "node test/e2e/map-fog.cjs"` |
| `CLAUDE.md` | A "Player screen and fog" section |

---

### Task 1: Fog model and player-view rendering

**Files:**
- Modify: `public/index.html`, in the "Dungeon rendering" block (`drawDungeon`, around line 1962), with new helpers just above it
- Create: `test/e2e/map-fog.cjs`
- Modify: `package.json` scripts

**Interfaces:**
- Produces (globals in `index.html`):
  - `fogKey(p) -> string`: `"gen|" + [seed, theme, size, rooms].join("|")`.
  - `fogNew(d) -> Uint8Array(W*H)`: all hidden except the entrance room (`d.rooms[0]`), revealed with `fogRevealRoom`.
  - `fogEncode(u8) -> string` and `fogDecode(str, n) -> Uint8Array`: run-length encoding as `"<value><count>,"` pairs, for example `"0120,1ad,"` (counts in base 36).
  - `fogRevealRoom(d, fog, x, y) -> boolean`. If `(x,y)` is a room cell (`d.rid`), it reveals every cell with that `rid`. If it is a corridor cell (`grid===2`), it flood-fills the connected corridor cells, stopping at room cells. It then always dilates the revealed set by 1 cell, so walls and hatching show, and reveals doors that touch it. It returns false when `(x,y)` is not floor.
  - `fogPaint(fog, d, x, y, size, val)`: sets a `size`×`size` square centred on `(x,y)`, clipped to the grid.
  - `fogBox(fog, d, x1, y1, x2, y2, val)`.
  - `drawDungeon(cv, d, showGrid, o = {})`, where `o = { player:false, fog:null, found:null /*Set of "x,y"*/, numbers:true, scale:null }`. The default `o` must draw exactly what it draws today.

- [ ] **Step 1: Write the failing test** `test/e2e/map-fog.cjs`.
  - The test starts an `http` server on port `0` serving `public/`, launches Chromium, sets `dmforge.offline=1` in an init script, opens `#map`, and fills the form: seed `FOGTEST1`, theme `crypt`, size `medium`, 10 rooms. Before writing the asserts, pick a seed whose map has a trap room and a secret door, and fix it in the test.
  - Through `page.evaluate`, it asserts:
    - `fogDecode(fogEncode(u), u.length)` equals `u` for a random array.
    - `fogNew(currentMap)` reveals every cell of room 1 and no cell of the boss room.
    - `fogRevealRoom` on a boss-room cell returns true and reveals all of that room's `rid` cells and their 1-cell ring.
    - `fogRevealRoom` on a rock cell returns false.
    - With everything revealed, the pixel at the centre of the trap icon is red-dominant (`r > 120 && g < 80`) when drawn with `{}`, and not red-dominant when drawn with `{player:true, fog:allRevealed}`.
    - In player mode with `fog = fogNew(...)`, the pixel at the boss room centre is the fog colour `#0b0a09` (±8 per channel).
    - Drawing with the default `o` gives the same `toDataURL()` as before the change. Record this as a reference hash in the test.
  - It prints `PASS`/`FAIL` lines and exits with a non-zero code on any failure.
- [ ] **Step 2: Run** `npm run test:map`. Expected: FAIL (`fogEncode is not defined`).
- [ ] **Step 3: Implement the helpers above and the `drawDungeon` options.**
  - Player mode skips `trap` icons and the `down` icon, and draws the boss number in the normal colour.
  - It draws unfound secret doors (`!o.found?.has(x+","+y)`) as a 3px wall line across the door edge instead of the "S".
  - Room numbers are drawn only when `o.numbers` is set and the room centre is revealed.
  - The header shows the name only.
  - After everything except the header, every fogged cell gets `#0b0a09` in player mode and `rgba(10,8,6,.5)` when `o.fog` is set in DM mode.
  - `o.scale` overrides the `dpr` factor; the player frame uses `2`.
- [ ] **Step 4: Run** `npm run test:map`. Expected: all PASS.
- [ ] **Step 5: Commit** with "Map fog model and player-view rendering".

### Task 2: Player screen window and channel

**Files:**
- Create: `public/player.html`
- Modify: `public/index.html` (the Player screen card markup after the Room Key card inside `#view-map`, plus a "Player screen" script block after "Map UI")
- Test: `test/e2e/map-fog.cjs`

**Interfaces:**
- Consumes: from Task 1, `drawDungeon(..., {player:true, fog, found, numbers, scale:2})`, `fogKey`, and `fogNew`.
- Produces:
  - The global `HOST = { ch: BroadcastChannel|null, win: Window|null, on:false, fog:Uint8Array|null, found:Set, numbers:false, undo:[] }`.
  - `hostStart()`, `hostStop()`, `hostSend()` (debounced 80 ms), `hostPing(fx, fy)`, and `hostLoad(d)` (load or create fog for map `d`).
- Channel protocol:
  - From the player: `{t:"hello"}` and `{t:"bye"}`.
  - From the DM: `{t:"frame", blob}`, `{t:"ping", x, y}` and `{t:"bye"}`.

- [ ] **Step 1: Extend the test.**
  1. Click `#hostStart`. Catch the popup with `context.waitForEvent("page")` and wait for `#tv` in the popup.
  2. In the popup, record every message received on the channel into `window.__msgs`.
  3. Assert that every message's keys are a subset of `t, blob, x, y`, and that `t` is in `["frame","ping","bye"]`.
  4. Assert that after the first frame, the popup's canvas pixel at the entrance room centre is not fog-coloured and the boss room centre is fog-coloured. Use the fraction positions of those room centres, computed in the DM page.
  5. Reload the popup and assert that a frame arrives again within 2 s.
  6. Assert that `#hostStatus` shows "TV connected".
- [ ] **Step 2: Run** `npm run test:map`. Expected: FAIL (no `#hostStart`).
- [ ] **Step 3: Implement `player.html`.**
  - It has a black full-window `<canvas id="tv">`, a centred "Waiting for the DM…" message in the app's Cinzel and Crimson Pro font stack, and no external scripts.
  - On `frame`: `createImageBitmap(blob)`, then draw it fitted and centred, and redraw on resize.
  - On `ping`: an expanding gold ring (`#f5bb63`) for 1.2 s at the fraction position within the drawn image.
  - On `bye`: show the waiting message.
  - Double-click toggles full screen.
  - It posts `hello` on load and `bye` on `pagehide`.
- [ ] **Step 4: Implement the DM side.**
  - The card is a `.card` with `.sec-h` "Player screen" and a "Host for players" (`#hostStart`) / "Stop hosting" button.
  - `#hostStatus` reads "TV connected" or "Not connected".
  - `hostStart` opens `player.html` with `window.open("player.html", "dmforge-tv", "popup,width=1280,height=800")`. If that returns `null`, it shows the toast "Your browser blocked the player window. Allow pop-ups for this site and try again."
  - `renderMap` calls `hostLoad(currentMap)` and redraws with `{fog: HOST.on ? HOST.fog : null}`. When hosting, it calls `hostSend()`.
  - A `hello` from the player marks the screen connected and sends a frame. A `bye` marks it disconnected.
  - `hostStop` posts `bye` and stops showing the tint.
- [ ] **Step 5: Run** `npm run test:map`. Expected: all PASS.
- [ ] **Step 6: Commit** with "Player screen window for the TV".

### Task 3: Fog tools, ping, and saving

**Files:**
- Modify: `public/index.html` (the Player screen card controls, canvas mouse handlers, `#mapSave` and `[data-openmap]` handlers)
- Test: `test/e2e/map-fog.cjs`

**Interfaces:**
- Consumes: from Tasks 1 and 2, `fogRevealRoom`, `fogPaint`, `fogBox`, `fogEncode`/`fogDecode`, `fogKey`, `HOST`, and `hostSend`.
- Produces:
  - `canvasCell(e) -> {x,y,fx,fy}|null`, which returns null outside the grid.
  - `fogSaveLocal()` and `fogLoadLocal(key) -> {fog, found}|null`.
  - Saved campaign map entries gain `fog: string` and `found: string[]`.

- [ ] **Step 1: Extend the test.** With hosting on:
  - Room tool: clicking the boss room centre makes the TV pixel there non-fog.
  - Undo: makes it fog again.
  - Brush tool (reveal, size 3): dragging across a corridor reveals those cells (check `HOST.fog`).
  - Box tool (hide): dragging over the entrance re-hides it.
  - Reveal all: then hide all.
  - Clicking at canvas pixel `(5,5)` (the header) changes nothing and throws no page error.
  - Secret door: in "Secret door found" mode, clicking the chosen seed's secret door adds it to `HOST.found`.
  - Ping: Shift+click produces a `ping` message on the TV.
  - Persistence:
    - Reload the DM page with the same seed and the fog is restored.
    - Save to a new offline campaign, generate a different seed, then open the saved map from the tracker: the fog is restored.
  - Cavern: generate a `cavern` map and assert that `fogRevealRoom` on a room cell reveals all cells with that `rid`.
- [ ] **Step 2: Run** `npm run test:map`. Expected: FAIL.
- [ ] **Step 3: Implement the controls.**
  - Tool chooser: a `.seg` segmented control named `fogTool` with Room / Brush / Box / Secret door.
  - A `.seg` for Reveal and Hide (`fogVal`).
  - A Brush size select with 1, 3 and 5.
  - Buttons: Reveal all, Hide all, Undo (`#fogUndo`; undo keeps up to 50 snapshots, each a `Uint8Array` copy).
  - A check for "Room numbers on TV".
  - A hint line: "Shift+click to ping the TV."
  - The controls are disabled until hosting starts.
- [ ] **Step 4: Implement the mouse handling on `#mapCanvas`.**
  - Cell maths: `x = floor(offsetX * (cv.width/dpr)/cv.clientWidth / CS)`, and the same for `y` minus `TOP`.
  - `pointerdown` and `pointermove` (while the button is held) paint for Brush.
  - `pointerdown` and `pointerup` define a Box; the box is shown on the DM canvas as a dashed rectangle while dragging.
  - A click applies Room or Secret door.
  - Every change pushes an undo snapshot first, then calls `fogSaveLocal()` and `hostSend()`.
- [ ] **Step 5: Implement saving.**
  - `#mapSave` stores `fog: fogEncode(HOST.fog)` and `found: [...HOST.found]` when fog exists.
  - The `[data-openmap]` handler writes `m.fog`/`m.found` into the local store before `renderMap()`.
  - The tracker's Maps list shows "· fog saved" when an entry has fog.
- [ ] **Step 6: Run** `npm run test:map` and `npm test`. Expected: all PASS, and API tests at 11/11.
- [ ] **Step 7: Commit** with "Fog tools, ping, and fog saving".

### Task 4: Owner check and notes

- [ ] **Step 1:** Take screenshots (scale 2) of the DM view with the tint and of the TV window, and send them to the owner.
- [ ] **Step 2:** Add a "Player screen and fog" section to `CLAUDE.md`: names, protocol, storage key, and the rule that the player window only ever gets pictures. Add the TV step to the `README.md` user guide.
- [ ] **Step 3:** Commit and push the branch. Do not merge to `main`.
