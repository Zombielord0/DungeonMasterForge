# Side menu with search (2026-11-24)

## Why

The owner wants the 16 tabs moved out of the header row into a menu down the left side, which can be scrolled, searched and folded away. The search box should find **everything** that matches, not just tab names. Typing "fireball" should show the characters who have it, the spell itself, and anything else that mentions it.

## Goals

- **A side menu on the left on laptops and tablets.** It holds a search box, then the tabs in groups. It scrolls on its own and stays put while the page scrolls.
- **Sections fold out under a tab.** Only tabs with real sections get a ▸ arrow:
  - **Campaign Tracker:** its 14 sub-tabs. A sub-tab opens the Tracker on that sub-tab.
  - **Villains & Monsters:** its modes.
  - **Items:** All, Standard, Magic, Mine.
  - **World:** places and the builder.

  Clicking a tab's name opens the tab; clicking the arrow unfolds its sections.
- **Groups (my call):**
  - Prep: Adventure, NPCs, World, Villains & Monsters, Dungeon Map, Campaign Tracker.
  - Characters: Characters.
  - Rules: Compendium, Spells, Feats, Items, Homebrew.
  - Players: Party, Journal, Chat, when they're shown.
  - Forge: Requests.
- **Folding the menu away.** A button folds it to a thin strip of icons, one per tab; hovering shows the name, and clicking opens the tab. Clicking again unfolds it. The choice is remembered, in the same way as `dmforge.hdrMini` (new key `dmforge.side.v1`, a UI preference, so not in `BACKUP_KEYS`).
- **Search finds everything that matches.** Results show as you type (from 2 letters, after a short pause), with arrow keys and Enter, and come in three groups, at most 5 rows each:
  1. **Your stuff:**
     - characters: name, class, spells, items, features;
     - Tracker campaigns: NPCs, Lore, Quests, Loot, session notes;
     - World places, Your NPCs, homebrew;
     - for players: the shared Journal.
  2. **Rules:** spells, items, monsters, feats, classes, subclasses, species and backgrounds, using the Compendium's existing search, both editions.
  3. **Tabs:** tabs and sections whose names match.

  "Show all N" under Rules opens the Compendium tab with that search filled in.
- **A result takes you to it:**
  - character → their sheet, scrolled to the matching spell or item;
  - spell, item or monster → its rules window (the Compendium's `open`);
  - campaign entry → that campaign's sub-tab, scrolled to the entry;
  - World place → the World tab on that place;
  - tab or section → that tab or section.

## Non-goals

- No new look: it uses the current stone-and-gold styles, and no wood.
- No search inside the full text of rules entries beyond what the Compendium already matches (names, groups, sources).
- No change to what players can see. Search only reads data the browser already has for that person: a player's browser holds no DM Tracker data.

## Phones

Phones keep their bottom bar (Sheet, Spells, Encounter and so on, plus More). **More** opens the same menu, with search, groups and sections, as a panel sliding in from the left instead of today's plain list. The phone header no longer carries the tab list.

## The header

On laptops the header keeps the title, emblem, torches, save badge, Backup, the bell and Install. The tab row, the "Hide tabs" button and the hidden tab picker (`hdrTabSel`) go, along with the `hdr-mini` / `hdr-auto` tab shrinking. The header still shrinks to a slim bar when scrolling, as now. The menu sits below the header and fills the rest of the screen's height.

## Approaches considered

1. **A new side menu that reuses the current links (chosen).** The `<nav>` links move into an `<aside>` on the left, and `route()` still marks the active tab. The menu, its search and the phone panel are one piece of code (`21-sidebar.js`). Rules search calls a version of `compendiumSearch` split so it can return results without drawing the Compendium page. This keeps one source for tab links (Portal shows and hides them as now) and one rules search.
2. **A search index built ahead of time.** This would be faster on very large lists, but it would go stale whenever a character or campaign changes, and the Compendium already searches thousands of rows quickly enough. Not chosen.
3. **Keep the header tabs and add a search box to the header.** Smaller, but not what the owner asked for (tabs on the left, folding). Not chosen.

## Left to the builder

- Icons for the folded strip: one emoji per tab, matching the app's existing emoji use.
- How long the pause before searching is (about 150 ms), and the exact width of the menu (about 240 px open, 56 px folded).
- How the Tracker scrolls to an entry and opens its card. Use the existing list rendering, and add ids where needed.
- Tests: a new `test:sidebar` check covering opening tabs and sections, folding and remembering, search results across the three groups ("fireball" on a saved Wizard who has it), keyboard use, the phone panel, and a player not seeing DM data. Update the checks that click header `nav a` links.
