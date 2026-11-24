# Map art: hand-drawn dungeon looks and richer region maps (2026-11-24)

**Asked by the owner:** better art for generated maps, with more options; Azgaar's Fantasy Map Generator as the model for the Region builder ("option B": its ideas built into the Forge, not an import). The owner saw mock-ups of the three dungeon looks and asked for all of them, and for every part of option B.

## Dungeon Map
- Three new Style choices: Inked sketch, Old atlas, Stone and torchlight. The layout never changes; the look only draws.
- Rough.js (MIT) draws the hand-drawn walls, seeded so the picture is the same every time.
- Doors, furniture, icons, fog, tokens and the header are the shared drawings, so what players can't see stays hidden in every look.
- Parchment, Blue and Dark are pixel-for-pixel unchanged (checked by hashing renders before and after).

## Region and world maps
- New shapes (archipelago, peninsula, volcano island, twin lands) and climates (temperate, desert, jungle, frozen north, swamp).
- Maps made or rolled from now on (`v: 2`) get lakes inland. Saved maps keep exactly the same land: their terrain only depends on the old recipe.
- A richer painted look for every generated map.
- Roads between towns and borders between regions, worked out from the pins shown, so the players' map only has what they've found.
- The Region builder adds towns and villages and two to four kingdoms, pinned where the preview shows them.

## Not done
- Picture maps (imported) get no roads or borders: the Forge doesn't know their land.
- Kingdoms are regions inside the region; their own maps are made the usual way.
