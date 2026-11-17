# Regions in the World builder: design

Date: 2026-11-17. Agreed with the owner in chat. A small change: short design.

## Why

The owner generates a map and wants to keep it as a named region in the World and a campaign ("Region One"), then generate another, say an island ("Region Two"), and keep that too. Today a region has to be made first, then opened, then given a map, and the campaign link is a separate step. The world map has only one map, and 🎲 Roll again replaces it.

## Goals

- A **🗺️ Region** kind in the World builder, next to Settlement, Inn, Shop, Temple and Dungeon.
- Its options: **Name** (the owner's own name; random when empty), **Shape** (Coast, Inland, Island), **Land** (Balanced, Mountains, Forest, Plains), plus the builder's usual **Inside** and **Add to campaign**.
- **Custom naming:** the map's feature names (mountains, forests, rivers, seas, lakes) can be typed over in the builder before saving, as on the map view now.
- A **live map preview** in the builder. 🎲 Roll again makes a new map. Typed feature names are cleared on a roll, because the features change.
- **✓ Add to World** saves a new place of type region with that map (`place.atlas`), linked to the chosen campaign's Lore (`wpSetCamp`, as the other kinds do). The builder then clears the name and rolls a fresh map, ready for the next region.
- Top-level regions already appear on the world map with their names. Nothing changes there.

## Non-goals

- Players adding regions. Players get no new access.
- Several world maps. There's still one world map.
- Importing a picture in the builder. Import stays on the region's map view, after it's saved.

## Approaches

- **A. A Region kind in the World builder (picked by the owner, "with custom naming").** It's the same place everything else is made, with name, inside and campaign.
- **B. "Save as a region" on the world map.** Rejected: the world map would double as a scratch pad, and the world overview would be cleared each time.

## The design

- `WB_KINDS.region = ["🗺️", "Region"]`. `WB_DEFAULTS.region = { shape: "coast", land: "balanced", names: {} }`, where `names` holds the typed feature names, by feature id.
- `WB.region(r, o)` returns a draft `{ name, type: "region", desc, sections: [], kids: [], npcs: [], atlas }`:
  - `atlas` is a full map `{ v: 1, seed: "at-" + build seed, shape, land, pins: {}, names }`. `names` comes from `atlasNames`, with `o.names` typed over it. The same build seed gives the same map, so the preview doesn't change while typing.
  - The random name comes from the map's own name tables, for example "the Ashen Reach". An island gets an "Isle" or "Isles" form.
  - `desc` is one plain sentence from the shape and land, for example "A coastal land of mountains."
- **The preview:** a canvas in the builder's output, drawn with `atlasDraw(cv, draft.atlas, { names, title })` after each builder render. Under it, "Names on the map" text boxes (`[data-wbname="<feature id>"]`) write to `o.names` without re-rolling.
- `wbCommit` saves `x.atlas` onto the new place. Pins fill in when the map is first opened (`atlasPinsFill`), as for any region.
- **Notes:** `docs/features/world-maps.md` and `docs/features/npcs-world.md`. A **What's new** entry.
- **Tests** (`test/e2e/atlas.cjs`):
  - the Region builder shows a preview canvas;
  - Shape and Land change the map;
  - a typed feature name survives a re-render and is saved;
  - Roll again changes the seed and clears typed names;
  - Add to World makes a region with `atlas`, in the chosen campaign's Lore, with the typed region name;
  - two regions in a row get different maps, and both show on the world map.

## Left to the builder

- The exact wording of the random region names and descriptions.
- The size of the preview canvas.
