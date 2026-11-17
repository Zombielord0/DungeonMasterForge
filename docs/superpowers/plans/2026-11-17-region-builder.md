# Region builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 🗺️ Region kind to the World builder that previews a generated map, takes custom names, and saves it as a region in the World and a campaign.

**Architecture:** A new `WB.region` builder in `src/app/06-npcs-world.js` returns a draft with a full map (`atlas`) whose seed comes from the build seed. `wbHTML` shows a canvas and feature-name boxes. `renderWorld` draws the canvas with `atlasDraw` after building the builder's HTML. `wbCommit` copies `atlas` onto the new place.

**Tech Stack:** Vanilla JS (global scope, `src/app/*.js`), Playwright checks.

**Spec:** `docs/superpowers/specs/2026-11-17-region-builder-design.md`

## Global Constraints

- Edit `src/` only. `npm run test:atlas` builds first.
- The same build seed gives the same map: `atlas.seed = "at-" + W.build.seed`.
- Typed feature names live in `W.build.o.names` (`{ featureId: name }`, each at most 60 characters). They're cleared on 🎲 Roll again and on Add to World.
- Region names are at most 120 characters (as `wbCommit` does now).
- Players get no new access. Nothing here touches `portal.js` or the API.

## Review Focus

1. **Typing a feature name must not re-roll or redraw the whole builder** (focus would jump). Use the `input` event and redraw only the canvas. Test in Task 1: type into a name box, and the box still has focus.
2. **An empty typed name** goes back to the generated name, never a blank label. Test in Task 1.
3. **Switching from Region to another kind and back** must not crash or leave a stale canvas. Test in Task 1: click Shop, then Region, and the canvas is drawn.
4. **Phone width (390 px):** the preview canvas fits without sideways scrolling. Test in Task 1 with `scrollWidth <= clientWidth`.
5. **Adding a region inside another region** makes it a child (`parent` set), not top level, so it isn't on the world map. Test in Task 1.

---

### Task 1: The Region builder

**Files:**
- Modify: `src/app/06-npcs-world.js`: `WB_KINDS`, `WB` (new `region`), `WB_DEFAULTS`, `wbHTML` (options, preview, names), `renderWorld` (draw after the build HTML, line about 425), the `input`/`change`/`click` handlers (`[data-wbname]`; `wbroll` clears names), `wbCommit` (`atlas`).
- Modify: `src/app.css`: `.wb-map canvas{width:100%;height:auto;display:block}` and the names grid (reuse `.atlas-names`).
- Test: `test/e2e/atlas.cjs`, before the final "no page errors" check.

**Interfaces:**
- Consumes: `atlasNames(m)`, `atlasDraw(cv, m, {names, title})`, `ATLAS_SHAPES`, `ATLAS_LANDS`, `ATLAS_NA`, `ATLAS_NB`, `wpSetCamp`, `wpNew`.
- Produces:
  - `WB.region(r, o) → { name, type: "region", desc, sections: [], kids: [], npcs: [], atlas }`
  - `wbMapDraw()`, which draws `#wbMapCv` from `wbDraft()`
  - DOM: `#wbMapCv`, `[data-wb="shape"]`, `[data-wb="land"]`, `[data-wbname="<feature id>"]`

- [ ] **Step 1: Write the failing checks** in `test/e2e/atlas.cjs`. Use a fresh `p.goto(URL + "#world")` and `W.build = null`, then click `[data-w="build"]` and `[data-w="wbkind"][data-k="region"]`.
  - `#wbMapCv` exists with `width > 0`. `wbDraft().atlas.seed === "at-" + W.build.seed`.
  - Select Shape `island` → `wbDraft().atlas.shape === "island"`. The random name of an island draft matches `/Isle/`.
  - The first `[data-wbname]` box: fill "Dragonspine" → `W.build.o.names[id] === "Dragonspine"`, `wbDraft().atlas.names.find(f=>f.id===id).name === "Dragonspine"`, and the box still has focus (`document.activeElement.dataset.wbname === id`).
  - Fill "" → the draft name equals `atlasNames(wbDraft().atlas).find(f=>f.id===id).name` (back to the generated one).
  - Fill "Dragonspine" again, then 🎲 Roll again → the seed changes and `Object.keys(W.build.o.names).length === 0`.
  - Make a campaign `c` with `blankCampaign("Isles")` and `Store.save(c)`. Re-render, select it in `[data-wb="camp"]`, fill Name "Region One", Add → a place named "Region One" with `type === "region"`, `atlas.shape === "island"`, `!p.parent`, and `Store.get(c.id).lore.some(l => l.wpId === p.id)`.
  - Then (the builder is still open): the Name box is empty, Shape `coast`, fill Name "Region Two", Add → its `atlas.seed` differs from Region One's. `atlasPlaces("world")` includes both.
  - Builder again: Inside = Region One, Name "Inner", Add → `wp(id).parent === regionOneId`, and `atlasPlaces("world")` doesn't include it.
  - Click Shop then Region → `#wbMapCv` is drawn (width > 0). No page errors.
  - At 390 px wide (`p.setViewportSize`), the builder on Region → `document.documentElement.scrollWidth <= clientWidth`. Restore the size.
- [ ] **Step 2: Run** `npm run test:atlas`. Expected: the new checks FAIL (no `region` kind).
- [ ] **Step 3: Implement** the Interfaces above.
  - Random name (`r` is the builder rng): Island → `the ${pick(ATLAS_NA)} Isle` or `the ${pick(ATLAS_NB)} Isles`. Otherwise → `the ${pick(ATLAS_NA)} Reach`, `the ${pick(ATLAS_NB)} Marches`, `the Kingdom of ${pick(ATLAS_NB)}` or `the ${pick(ATLAS_NA)} Vale`.
  - `desc`: `` `A ${{coast:"coastal land",inland:"land far from the sea",island:"island"}[shape]}${land === "balanced" ? "" : " of " + {mountains:"mountains",forest:"forests",plains:"open plains"}[land]}.` ``
  - Name boxes reuse the map view's feature labels. `input` → set or delete in `o.names`, then `wbMapDraw()` only.
  - `wbCommit`: `...(x.atlas ? { atlas: JSON.parse(JSON.stringify(x.atlas)) } : {})`, and clear `B.o.names = {}` with the existing reset.
- [ ] **Step 4: Run** `npm run test:atlas` and `npm run test:world`. Expected: PASS.
- [ ] **Step 5: Commit** `git add -A src test && git commit -m "World builder: Region maps"`

### Task 2: What's new and notes

**Files:**
- Modify: `src/app/18-news.js`: a new first entry, `id: "2026-11-17-region-builder"`, `go: "world"`, title "Make regions with their maps". Plain words: World builder → 🗺️ Region, name it, pick shape and land, rename mountains and rivers, Roll again, Add to World into a campaign, then make the next one.
- Modify: `docs/features/world-maps.md` (a "Region builder" line under "On the World tab") and `docs/features/npcs-world.md` (the World builder kinds list).

- [ ] **Step 1:** Write them.
- [ ] **Step 2: Run** `npm test` and `npm run test:all`. Expected: all PASS (name any that passed only on retry).
- [ ] **Step 3: Commit** `git add -A src docs && git commit -m "Region builder: What's new and notes"`
