# Dungeon Map layout: your maps, Build, Run (2026-11-25)

## Why
The owner finds the Dungeon Map tab too busy: the generator, the map, the Player Screen tools and the Room key are all on one long page. They want building a map kept apart from running it for the players, with a separate way into your saved maps to run one at the table.

## The choice
Three mockups were shown:
- **A:** a Build | Run switch.
- **B:** a full-screen table view.
- **C:** your maps first, then Build or Run.

The owner agreed with the recommendation: **C with B's table view**.

## What the tab becomes
The tab has three modes, held in the class on `#view-map`: `map-list`, `map-build` and `map-run`.

**1. Your maps (`map-list`)**
- Picture cards of every saved map:
  - each campaign's maps (`c.maps`);
  - World places' maps (`place.map`).
- A picker narrows the list to All, one campaign, or World places.
- Each card shows a thumbnail, the name, the kind or theme, the room count, and where it's saved.
- Each card has **✏ Edit** (opens it in Build) and **▶ Run** (opens it in Run).
- **+ New map** opens Build with a fresh dungeon. **⬆ Import** opens the existing import.
- With no saved maps yet, the list says so and offers + New map.

**2. Build (`map-build`)**
- Today's page without the Player Screen card:
  - the generator form;
  - the editor and import panels;
  - the map;
  - the Room key, which is part of making the map.
- **← Your maps** goes back to the list.
- **▶ Run for players** opens the map on screen in Run.

**3. Run (`map-run`)**
- The map fills the screen, over the header and side menu.
- A slim bar at the top has:
  - the map's name;
  - the zoom buttons;
  - 📺 Host for players with its status;
  - **✕ Done**, which goes back to where you came from.
- A panel on the right has tabs:
  - **Fog & TV:** fog tools, reveal/hide all, undo, room numbers;
  - **Tokens;**
  - **Handout;**
  - **Room key:** clicking a room on the map shows that room here, as hover does today.
- Esc closes Run, unless a dialog is open.
- On phones the panel sits under the map instead of beside it.

## Constraints
- No change to how maps, fog, tokens or the TV work. The same elements and listeners move between layouts by CSS class only; no element is rebuilt. Fog and tokens keep their keys.
- Leaving the tab (`route()` to another view) leaves Run.
- **Which mode the tab opens in** (decided while building): Your maps when there are saved maps, otherwise Build, since an empty list is no use. Within a visit the tab stays in the mode you left it in. Opening a map from the Tracker or the World goes to Build. Nothing is saved, so no new storage key.
- The existing checks that use the Player Screen enter Run first (`mapMode("run")`).

## Left to the builder
- The thumbnail code: the World tab's `wpMapThumb` becomes a shared `mapThumbInto(box, m)`.
- The exact CSS.
- A new check, `test:maplayout`, covering:
  - the list with saved maps from a campaign and a World place;
  - Edit and Run from a card;
  - New map;
  - Build without the Player Screen;
  - Run full screen with its tabs;
  - Done and Esc;
  - leaving the tab;
  - a phone.
