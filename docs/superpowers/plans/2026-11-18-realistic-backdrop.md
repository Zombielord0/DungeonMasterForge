# A realistic background: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the code-drawn corridor behind the app with a photo-realistic corridor picture, with the animated flames burning on the picture's two torches.

**Architecture:** The pictures are WebP files in `src/backdrop/`. `tools/build.mjs` fingerprints them like the code and data, and rewrites their names inside the CSS. `#bgScene` shows the picture as a CSS `cover` background. The canvas becomes a transparent layer that only draws flames and a flickering glow, placed with the same cover maths.

**Tech Stack:** Vanilla JS (global scripts joined by `tools/build.mjs`), CSS, Playwright checks in `test/e2e/*.cjs`, Python + Pillow only to prepare the pictures.

**Spec:** `docs/superpowers/specs/2026-11-18-realistic-backdrop-design.md`

## Global Constraints

- Edit `src/`, `data/`, `tools/`, `test/`; never `public/` (build output).
- Owner is on Windows: anything the owner runs is an `npm run …` script.
- Frame cap stays: 33 ms between frames (50 ms on coarse pointers); drawing stops while the tab is hidden; header torches skipped while `hdr-away`.
- Reduced motion (`prefers-reduced-motion: reduce`): the still picture only; the canvas draws nothing.
- The header's two title torches (`header .torch`, the `heads` array in `15-torch.js`) don't change.
- Wide picture: `src/backdrop/corridor-wide.webp`, 2560 × 1429, WebP quality 62 (about 243 KB), made from the owner's upload `/mnt/user-data/uploads/5e2d30bf-image.webp` (2752 × 1536).
- Torch flame bases in the wide picture, as fractions of its width and height: left `{x: .284, y: .322}`, right `{x: .716, y: .322}`.
- The pictures are not added to the service worker's install list (`ASSETS`); `/assets/*` is cached on first use by the existing fetch handler, so a phone never downloads the wide picture it doesn't show.
- Until the picture arrives, the page shows `#06070e`, the colour the backdrop has today.

## Review Focus

1. **A window resized between wide and tall** (rotating a phone, dragging a laptop window narrow): the flames must move to the torches of the picture now showing, not stay where the old picture's torches were. → Task 2, Step 1 (`resize keeps flames on the torches`).
2. **Very wide or very tall windows** (21:9 monitor, short laptop window): `cover` crops the picture, so torches can move off-screen. Flames for off-screen torches are skipped, never drawn at a clamped edge. → Task 2, Step 1 (`off-screen torch is skipped`).
3. **Offline second visit:** the picture must come from the cache with no connection. → Task 1, Step 1 (`backdrop offline`).
4. **Picture slow or missing** (bad connection, 404): the page still shows the dark colour and stays usable; nothing throws. → Task 2, Step 1 (`missing picture`).
5. **The TV player screen** (`public/player.html`) and printing (`@media print` hides the backdrop today): unchanged. → Task 2, Step 1 (`print hides backdrop`).

---

### Task 1: The build fingerprints pictures

**Files:**
- Create: `src/backdrop/corridor-wide.webp`, `tools/make-backdrop.py`
- Modify: `tools/build.mjs` (section 2), `test/e2e/assets.cjs`, `tools/netlify-skip.mjs` (add `make-backdrop.py` to the tools-only list; `src/backdrop/` changes already build)

**Interfaces:**
- Produces: built name map `out["/assets/backdrop-wide.webp"] = "/assets/backdrop-wide.<fp>.webp"` for every `src/backdrop/<name>.webp` (built name is `backdrop-<name without "corridor-">`, so `corridor-wide.webp` → `backdrop-wide`). `public/assets/app.<fp>.css` has every `url("/assets/backdrop-*.webp")` replaced with its built name. Later tasks write `url("/assets/backdrop-wide.webp")` in `src/app.css`.
- `tools/make-backdrop.py <source> <out.webp> [width=2560] [quality=62]`: resizes with LANCZOS and saves WebP (`method=6`). Needs Pillow. Run once by the builder; not part of `npm run build`.

- [ ] **Step 1: Write the failing checks in `test/e2e/assets.cjs`**
  - `backdrop-wide: public/assets/backdrop-wide.<fp>.webp exists, its fingerprint matches its bytes, and it is byte-identical to src/backdrop/corridor-wide.webp`
  - `app styling: matches src/app.css` becomes: the built CSS equals `src/app.css` after replacing each `/assets/backdrop-*.webp` with its built name, and the built CSS has no un-fingerprinted `/assets/backdrop-` reference left.
  - `backdrop is not in the install list`: `sw.js`'s `ASSETS` contains no `.webp`.
  - `backdrop offline`: after the existing first visit, with `ctx.setOffline(true)`, a `fetch` of the built picture URL from the page returns `ok` and `content-type` `image/webp`. Add `".webp": "image/webp"` to `TYPES` there and in `test/e2e/server.mjs`.
  - Keep `the page loads five fingerprinted files`: pictures are referenced from the CSS, not the page.

- [ ] **Step 2: Run `npm run test:assets`.** Expected: the new checks FAIL (no picture, no rewrite).

- [ ] **Step 3: Make the picture and teach the build.**
  - Write `tools/make-backdrop.py`; run `python3 tools/make-backdrop.py /mnt/user-data/uploads/5e2d30bf-image.webp src/backdrop/corridor-wide.webp` → 2560 × 1429, about 243 KB.
  - In `tools/build.mjs`, change `emit` to accept a `Buffer` (fingerprint the bytes; log size from `.length`), emit each `src/backdrop/*.webp` **before** the CSS, then emit the CSS with the backdrop names replaced. Exclude `.webp` from the `files` list written into `sw.js`. Update the header comment's table with the `src/backdrop/*.webp` line.

- [ ] **Step 4: Run `npm run test:assets`.** Expected: all PASS.

- [ ] **Step 5: Commit** `Build: fingerprint the background pictures`.

---

### Task 2: The picture behind the app, with live flames on its torches

**Files:**
- Modify: `src/app.css` (the `#bgScene` rule near line 530), `src/app/15-torch.js` (replace the corridor section, lines 73–436, keep `Flame`, sprites, `GLOW`, header torches and the loop), `test/e2e/layout.cjs` only if its `__forgeBg` use breaks
- Create: `test/e2e/backdrop.cjs`; add `"test:backdrop": "node tools/build.mjs --quiet && node test/e2e/backdrop.cjs"` to `package.json`

**Interfaces:**
- Consumes: `url("/assets/backdrop-wide.webp")` rewritten by Task 1.
- Produces, in `15-torch.js`:
  - `const BACKDROPS = { wide: { w: 2560, h: 1429, torches: [{ x: .284, y: .322 }, { x: .716, y: .322 }] } }`; Task 3 adds `tall`.
  - `const TALL_MQ = "(max-aspect-ratio: 3/4)"`; `sceneName() -> "wide" | "tall"` returns `"tall"` only when `BACKDROPS.tall` exists and the query matches.
  - `coverBox(pic, W, H) -> { s, ox, oy }`, with `s = Math.max(W / pic.w, H / pic.h)`, `ox = (W - pic.w * s) / 2`, `oy = (H - pic.h * s) / 2` (matches CSS `50% 50% / cover`).
  - Each torch on screen: `{ x: ox + t.x * pic.w * s, y: oy + t.y * pic.h * s, size: .034 * pic.h * s, flame: Flame, ph }`; torches with `x < 0 || x > W || y < 0 || y > H` are left out.
  - `window.__forgeBg` getter → `{ scene, torches, W, H, frames, draw }`, where `frames` counts calls to `draw`.

- [ ] **Step 1: Write the failing checks in `test/e2e/backdrop.cjs`** (own static server for `public/`, offline flag set, like `assets.cjs`; images with `image/webp`)
  - `backdrop picture shows` at 1366 × 850: `getComputedStyle(#bgScene).backgroundImage` contains `/assets/backdrop-wide.` and `backgroundSize` is `cover`; the picture URL responds 200.
  - `flames sit on the torches` at 1366 × 850, 1920 × 1080 and 1280 × 1000: for each of the two torches, `__forgeBg.torches[i].x/y` are within 2 px of the position the test computes itself from 2560 × 1429, the fractions above and cover maths.
  - `resize keeps flames on the torches`: resize 1366 × 850 → 1000 × 900, wait 300 ms, positions match the new cover maths.
  - `off-screen torch is skipped`: at 600 × 1000 (wide picture, cropped hard), `torches.length` equals the number of the two expected positions that land inside the window (compute in the test; expect 0).
  - `the old corridor is gone`: `__forgeBg` has no `drips`, `cobwebs` or `floorStones`; the canvas, sampled with `getImageData` after a frame at a point well away from both torches (`W/2`, `H*.6`), has alpha 0 (the canvas is transparent; the picture is CSS).
  - `reduced motion draws nothing`: new context with `reducedMotion: "reduce"`; after 1 s, `__forgeBg.frames` ≤ 1 and the canvas pixel at the left torch has alpha 0.
  - `frame cap`: over 2 s on desktop, `frames` is between 40 and 66.
  - `missing picture`: route `**/backdrop-*.webp` to 404; page loads, no page errors, `#bgScene` background colour is `rgb(6, 7, 14)`.
  - `print hides backdrop`: `page.emulateMedia({ media: "print" })`; `#bgScene` is `display: none` (`src/app.css` line 551 already has this rule; the check guards it).

- [ ] **Step 2: Run `npm run test:backdrop`.** Expected: FAIL (old scene still drawn, no picture).

- [ ] **Step 3: CSS.** `#bgScene` keeps its position and size and gets `background:#06070e url("/assets/backdrop-wide.webp") 50% 50%/cover no-repeat`. Remove nothing else in this task.

- [ ] **Step 4: Rewrite the scene in `15-torch.js`.** Delete the corridor geometry, `shade`, `quad`, `stone`, `mortar`, `drawBrazier`, `drawCobweb`, `buildStatic`, `drawDrips`, the drips and the `srand` seed if nothing else uses it. `resize()` sets `W`, `H`, `DPR`, canvas size, the scene and torches (new `Flame(size)` per torch; keep `ph` random). `draw(dt)` clears the canvas, then per torch draws the flickering `GLOW` halo with `"lighter"` (alpha about .35 × flicker, radius about 4.5 × size, using the existing flicker formula) and `flame.update/draw` at the torch point; increments `frames`. With reduced motion, `resize()` clears the canvas and nothing calls `draw`; header torches keep today's reduced-motion behaviour. Update the file's top comment.

- [ ] **Step 5: Run `npm run test:backdrop` and `npm run test:layout`.** Expected: PASS. Then look at screenshots at 1366 × 850 and 390 × 844, and tune the flame `size` factor and halo alpha until the moving flames cover the painted ones without a visible double flame. Re-run the checks if a constant changed.

- [ ] **Step 6: Commit** `A realistic background: the corridor picture with live torchlight`.

---

### Task 3: The phone picture, notes and What's new

Starts when the owner sends the tall picture. If it hasn't arrived when Task 2 is reviewed, the owner chooses: wait, or ship with the wide picture on phones too and add the tall one later as its own small change.

**Files:**
- Create: `src/backdrop/corridor-tall.webp`
- Modify: `src/app.css`, `src/app/15-torch.js` (`BACKDROPS.tall`), `test/e2e/backdrop.cjs`, `src/app/18-news.js`, `CLAUDE.md`, `docs/features/layout.md`

**Interfaces:**
- Consumes: `BACKDROPS`, `TALL_MQ`, `coverBox`, `__forgeBg.scene` from Task 2.

- [ ] **Step 1: Make the picture and measure its torches.** `python3 tools/make-backdrop.py <upload> src/backdrop/corridor-tall.webp 1080 62`. Find the two flame bases the way they were found for the wide picture: the centre of pixels with `r ≥ 252, g ≥ 240, r − b > 60` per half, base at that cluster's 95th-percentile `y`. Record them as fractions.

- [ ] **Step 2: Write the failing checks** in `backdrop.cjs`: at 390 × 844 and 412 × 915, `__forgeBg.scene === "tall"`, the background image contains `/assets/backdrop-tall.`, and flames match cover maths for the tall picture's size and fractions. At 1366 × 850 the scene stays `"wide"`. Rotating 390 × 844 → 844 × 390 switches to `"wide"` with matching positions.

- [ ] **Step 3: Run `npm run test:backdrop`.** Expected: the new checks FAIL.

- [ ] **Step 4: Add the tall picture.** `BACKDROPS.tall = { w, h, torches }` with the measured values; CSS `@media (max-aspect-ratio:3/4){#bgScene{background-image:url("/assets/backdrop-tall.webp")}}`. Update Task 1's asset check to cover `backdrop-tall` too.

- [ ] **Step 5: Run `npm run test:backdrop` and `npm run test:assets`.** Expected: PASS.

- [ ] **Step 6: What's new and notes.**
  - Top of `NEWS`: `{ id: "2026-11-18-realistic-backdrop", date: "2026-11-18", title: "A real dungeon behind the Forge", items: ["The background is now a photo-real stone corridor, with its two torches burning live. Phones get their own tall version.", "If your device is set to reduce motion, the picture stays still."] }`.
  - `CLAUDE.md`: the `15-torch.js` row ("the backdrop picture's live torchlight and the header torches…"), `src/backdrop/` and `tools/make-backdrop.py` in the code table, `test:backdrop` in the checks list, and a "Where things stand" line for this branch.
  - `docs/features/layout.md`: a short "Background" section: pictures in `src/backdrop/`, torch fractions in `BACKDROPS`, how to swap a picture (run `make-backdrop.py`, re-measure torches, update `BACKDROPS`, run `npm run test:backdrop`).

- [ ] **Step 7: Run `npm test` and `npm run test:all`.** Expected: all PASS (say if one passed only on its retry).

- [ ] **Step 8: Commit** `A realistic background: phone picture, notes and What's new`.
