# NPC Pictures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** each NPC in the Campaign Tracker can have an uploaded or linked picture, which can be shown on the TV.

**Architecture:** the Tracker's generic list renderer (`LISTS` and the item renderer near `public/index.html:3398`) gets an NPC-only picture frame. Uploads reuse `MAPIMG` (IndexedDB) and `loadImageCanvas`. Show on TV reuses `handoutShow`.

**Tech Stack:** vanilla JS in `public/index.html`, IndexedDB and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-16-npc-pictures-design.md`

## Global Constraints

- Uploads: at most 1024 px on the long side, WebP, IndexedDB key `npc-<npc id>`, NPC field `img`.
- Links: NPC field `imgUrl`, `https:` only; anything else is refused with a toast.
- The TV gets only the picture. Never NPC names, notes or secrets.
- The `NEWS` entry goes at the top of the list, in plain words. The `test:npcpic` script runs on Windows through npm.

## Review Focus

- **An upload that isn't a picture** (for example, a PDF picked by mistake) → toast "Couldn't open that picture. Try a PNG or JPG." and nothing changes.
- **Deleting an NPC that has an uploaded picture** → its IndexedDB entry is removed too, so it doesn't sit there unused.
- **A picture missing on this device** (campaign restored from a backup) → the frame shows "Picture not on this device" with Add picture, not a broken image.
- **Show on TV with a link from a site that blocks copying** → a toast explains; the TV picture doesn't change.
- **Imported campaign JSON with `img` or `imgUrl`** → the same frame logic; bad `imgUrl` values aren't rendered as links.

---

### Task 1: NPC picture frame, storage and Show on TV

**Files:**
- Modify: `public/index.html`:
  - the list item renderer (~3398)
  - the delete handler for `data-del`
  - `MAPIMG` (add `del(id)`)
  - CSS for `.npc-pic`
  - `NEWS`
- Create: `test/e2e/npc-pictures.cjs`, modelled on `test/e2e/tv.cjs` (its own static server, offline mode)
- Modify: `package.json` (`"test:npcpic": "node test/e2e/npc-pictures.cjs"`), `CLAUDE.md` (a feature note and the commands list), `README.md` (one line)

**Interfaces:**
- Produces:
  - `MAPIMG.del(id)`.
  - `npcPicHTML(it)` returns the frame HTML.
  - `npcPicSet(npcId, file)`, `npcPicLink(npcId, url)`, `npcPicClear(npcId)`, `npcPicTV(npcId)`.
  - Buttons use `data-npcpic="add|link|tv|clear"` with `data-id`. A hidden file input is `#npcPicFile`.
  - After a frame is drawn, `npcPicFill()` loads each `img[data-npcimg]` from IndexedDB into an object URL.
  - Piece 4 (MythWeaver) sets `imgUrl` on imported NPCs.

- [ ] **Step 1: Write the failing check `test/e2e/npc-pictures.cjs`.** It runs in offline mode and seeds one campaign with NPC `{id:"n1", name:"Aldric"}` in `dmforge.campaigns.v1`. It checks, in order:
  1. Tracker → NPCs: `.npc-pic` exists for Aldric, with Add and Link buttons and no TV button.
  2. Upload a 2000×1000 PNG made on the fly in the test (a canvas-drawn blob written to the scratch folder). Then:
     - the frame's `img` has `naturalWidth` ≤ 1024
     - the stored campaign has `img: "npc-n1"`
     - IndexedDB `dmforge-maps` has the key `npc-n1`
  3. Reload: the picture is still shown.
  4. Uploading a text file → the toast text matches /Couldn't open that picture/, and `img` is unchanged.
  5. 📺 Show on TV → the TV pop-up opens and `window.tvFrames` increases. The frame canvas is the handout: check that its size matches the picture.
  6. Link `http://example.com/a.png` → refused (toast /https/). Link `https://…` is stored as `imgUrl`.
  7. Delete the NPC → IndexedDB no longer has `npc-n1`.
  8. Seed `img: "npc-gone"` with no stored picture → the frame text matches /not on this device/.
- [ ] **Step 2:** Run `npm run test:npcpic`. Expected: FAIL at check 1 (no `.npc-pic`).
- [ ] **Step 3: Implement.**
  - In the item renderer, when `subTab === "npcs"`, wrap the item in a two-column layout: `npcPicHTML(it)` on the left, the fields on the right. Under 600 px wide, stack them.
  - Uploads go through `loadImageCanvas`, then get scaled to 1024, then `canvasBlob`, then `MAPIMG.put`.
  - On TV:
    - For an upload, use the stored blob.
    - For a link, `fetch(url, {mode:"cors"})`. On failure, toast "That website doesn't let the Forge copy its picture. Download it and use 🖼 Add picture instead."
    - Make a canvas through `loadImageCanvas`, then call `hostStart()` if not hosting, then `handoutShow(cv)`.
  - On NPC delete, call `MAPIMG.del(it.img)` when it's set.
- [ ] **Step 4:** Run `npm run test:npcpic`, then `npm run test:tv` (handouts still work). Expected: both PASS.
- [ ] **Step 5: Docs.**
  - `NEWS`: id `2026-11-16-npcpics`, title "Pictures for your NPCs", `go: "tracker"`. Items:
    - "Add a picture or a picture link to any NPC."
    - "Show it on the TV with one click."
  - CLAUDE.md: a short "NPC pictures" section, plus `npm run test:npcpic` in Commands.
  - README: one line.
- [ ] **Step 6:** Commit: "NPC pictures: upload, link and show on TV".
