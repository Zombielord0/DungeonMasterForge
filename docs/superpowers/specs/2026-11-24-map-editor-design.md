# Dungeon Map editor (2026-11-24)

**Asked by the owner:** "our map maker should have the ability to function and look as good as" Dungeon Scrawl. The owner picked, for the first stage, all four of: draw and erase rooms; doors, stairs and text; furniture and pictures; style controls. The editor lives **inside the Dungeon Map tab** (an Edit button on any map, plus New blank map). Dungeon Scrawl is a guide to features only: none of its art, pictures or code is used.

## What the DM can do
- **✏️ Edit map** on any generated dungeon turns it into a drawn map, keeping its rooms, room key, doors and furniture. **New blank map** starts an empty one of the chosen size.
- **Draw:** Room (drag a rectangle), Round room (drag an ellipse), Shape (click corners, double-click or click the first corner to close), Paint (brush whole squares). **Erase** works the same way, cutting the shapes out. Shapes snap to half squares, so round rooms and diagonal walls are smooth, not stair-stepped.
- **Place:** doors on a square's edge (normal, secret, locked, bars), stairs (up or down), room numbers (each makes a room key entry), text labels (a "DM only" tick keeps a label off the players' map), furniture from a library (rotate and resize), and pictures uploaded from the DM's computer.
- **Select** moves, rotates, resizes or deletes anything placed. **Undo / Redo** (and Ctrl+Z / Ctrl+Y) for every change.
- **Style:** starts from any of the six looks, then wall colour, wall thickness, wall roughness, floor colour, grid (lines, dots, none) and hatching on or off.
- Everything else keeps working: fog, tokens, the TV, the room key, Run this fight, Save to campaign or a World place, PNG and player PNG.

## Data
- A drawn map is `{ kind: "drawn", id, name, W, H, theme, level, party, style, base, shapes, doors, stairs, labels, props, rooms, look }`:
  - `base`: the starting floor squares (run-length text, like fog), from the generated dungeon or empty;
  - `shapes`: `[{ op: "add"|"cut", t: "rect"|"ellipse"|"poly"|"cells", ... }]` in square units, applied in order;
  - `doors: [{ x, y, dx, dy, kind }]`, `stairs: [{ x, y, rot, down }]`, `labels: [{ id, x, y, text, size, dm }]`, `props: [{ id, k, x, y, w, h, rot, img? }]`;
  - `rooms`: room key entries `{ num, cx, cy, type, notes, content, enc? }`;
  - `look`: style overrides `{ wall, wallW, rough, floor, grid, hatch }`.
- The squares used by fog, tokens and "reveal room" are worked out from the floor (a square is floor when at least half of it is).
- Uploaded pictures go in the `dmforge-maps` IndexedDB as `prop-<id>` (in backups, not in account saves, like map pictures).
- Saved in campaigns and World places as is (small: no pictures). `fogKey` for a drawn map is `drawn|<id>`.

## Drawing
- The floor is a mask drawn from `base` and `shapes` (canvas fill and cut). Walls are traced round the mask (marching squares at quarter squares) and drawn in the look's ink: hand-drawn (Rough.js) for Parchment, Inked sketch and Old atlas; straight for Blue, Dark and Stone and torchlight.
- Hatching, textures, paper and torchlight reuse the six looks' colours and finishing.
- The players' picture leaves out DM-only labels, secret doors (shown as wall), traps and the boss marker, as today.

## Not in this stage
- Layers, multiple floors, and Roll20 sync.
- Pictures in account saves.
