# Book pages (2026-11-23)

**Why:** the owner wants the Forge to look like a real D&D rulebook at the table: the aged parchment pages and the way a printed rulebook lays things out (they named the 3.5 Player's Handbook as the feel). Not the book's paintings.

**Goals:** what you read sits on paper with stains and darker edges, small-caps titles, coloured header bands, shaded boxes and striped tables. It covers spells, items, the Monster Manual, the character sheet and the players' Journal, plus the Adventure, NPC and monster previews that were already parchment (now the same paper).

**Non-goals:** the header, tabs, side panels, menus and buttons stay dark stone, so controls stay easy to find. No layout changes to the sheet or lists.

**Anti-goals:**
- No picture, scan or exact page decoration from any Wizards of the Coast book. The paper is drawn in CSS (SVG noise and gradients).
- No text too light to read on the paper.

**Approaches considered:**
1. **CSS on the existing markup, chosen.** It's one block at the end of `src/app.css` that recolours the reading areas through the app's colour settings (`--text`, `--muted`, `--gold`, `--well`), so the code files don't change. It's easy to revert.
2. A `book` class added in each renderer. Clearer selectors, but it touches five code files for a look the owner may revert.
3. A paper picture file (like the corridor backdrop). Richer grain, but another download, and it's harder to keep original.

**Decided with the owner:**
- The mockup (`.superpowers/mockups/book-look.html`, not committed): paper, red and blue bands, small caps.
- The screens: the suggested ones plus the Journal.
- It goes on preview 23, and is reverted if the owner doesn't like it.

**Left to the builder:**
- exact inks;
- which section gets a blue band (every second sheet section, and the Journal's inner sections);
- the readability check (`npm run test:book`: text inside the pages at least 4.5:1 against the paper).

**Later the same day (owner):**
1. The owner asked for darker, aged, wrinkled paper.
2. They then sent a picture of a 3.5-era Player's Handbook page and asked for that parchment and that text font. The final look:
   - yellowed, mottled parchment, lighter than step 1, with only faint creases;
   - EB Garamond body text, near black;
   - steel-blue capital headings over a thin rule, in place of the red bands.
3. Nothing is copied from the book: not its art, its red marbled frame or its fonts.

**Final (owner):** the parchment look goes only where the Forge already had parchment (adventures, NPC cards, forged monsters, the monster builder preview). Everything else is rolled back to stone. The owner said to keep the text, so EB Garamond also stays on spells, items, the Monster Manual, the character sheet and the Journal.
