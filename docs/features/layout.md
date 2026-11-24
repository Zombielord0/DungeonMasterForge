# Phone and laptop layout

Styling is in `src/app.css`; the header behaviour (hdrAuto) and the jump bar are in `src/app/13e-sheet.js` and `14-boot.js`.

Moved here from `CLAUDE.md` on 2026-11-17, unchanged except that `public/index.html` now means the files in `src/app/` (see "How the page is built" in `CLAUDE.md`).

## Phone and laptop layout (2026-11-17)

- **Design and plan:** `docs/superpowers/specs/2026-11-17-phone-and-laptop-layout-design.md` and `docs/superpowers/plans/2026-11-17-phone-and-laptop-layout.md`.
- **Who uses what:** players use their sheets on phones mid-fight; the DM runs the map on a laptop. Laptop and mouse layouts must not change.
- **Pop-up windows:**
  - `#modal`, `#backupModal`, `#impCharModal`, `#lvModal`, `#featModal`, `#choiceModal` and `#actModal` cap their `.box` at `calc(100dvh - 24px - safe areas)` (with a `vh` line first) and scroll inside.
  - The box's last child that holds buttons is `position:sticky; bottom` (one CSS rule using `:has(button)`), so new windows get this for free if their buttons are the last row.
  - `newsOpen` sets the What's new panel's `max-height` from where it opens. Its `top` comes from the bell, measured from where the phone header ends up.
- **Phone header (600 px and under):**
  - The slim `hdr-mini` look is applied by media query unless `hdr-full` is set ("▾ Show tabs", this visit only; the stored `dmforge.hdrMini` is for computers).
  - `hdrAuto()` toggles `hdr-away` on `<html>`. It hides after scrolling down past the header's height, shows after 24 px of scroll-up or within 80 px of the top, and hides while a form field outside the header has focus.
  - It stays shown while What's new is open. `hdrHold` ignores scrolling for 500 ms after Show tabs, because the page shifts.
- **Bottom of the page:**
  - `main` has `96px` + safe-area bottom padding, so the 🎲 Rolls dock never covers the last control.
  - The toast sits at `76px` + safe area and is hidden with opacity. `viewport-fit=cover` is on in `index.html` and `player.html`.
- **Touch (`pointer:coarse`):** `.btn.sm`, `.icon-btn`, `.cond`, `.chip` and `.ctr-b` are at least 40 × 40, `label.check` rows are 40 px, and the sheet labels are 12.5 px.
- **Jump bar:** `sheetJumpHTML(c)` makes `#sheetJump` (a div, not a `nav`, because the header's `nav a` styles would apply) at the top of the My Characters sheet. It's shown at 600 px and under and sticky under the header. Links are `[data-jump]` to `#sec-hp`, `#sec-attacks`, `#sec-spells`, `#sec-gear` and `#sec-notes`, with `scroll-margin-top`.
- **Search fields:** Catalogs, trackers and pickers use `type="search"` and the shared field theme in `src/app.css`. Search controls request autocomplete off and use the same dark palette when the browser applies autofill.
- **Spells on phones:** the filters sit inside `#spFilters`, closed unless `#spForm.filters-open`. `#spFiltersBtn` shows "▾ Filters · N on" (`spFilterCount`, `spFiltersSync`).
- **Grid columns** (`.layout>*`, `.tlayout>*`) have `min-width:0`, so wide content scrolls inside instead of widening the page.
- **Tests:** `npm run test:layout` (`test/e2e/layout.cjs`) runs at 390 × 640 touch, 768 × 1024 touch, 1366 × 768 mouse and 844 × 390 touch. `MOUSE_H` holds the mouse heights of the small controls, which must not change.

## UI polish (2026-11-18)

From a review of the Adventure, Characters and Items tabs. Checks: `npm run test:polish` (`test/e2e/ui-polish.cjs`).
- `showResult(sel)` (`01-core.js`): on screens up to 900px wide, Forge scrolls to the result (`#genOut`, `#pcOut`), 8px below the top on phones (the header slides away) or 80px on tablets.
- Laptops and tablets: `hdrShrink(y)` (`14-boot.js`) adds `hdr-auto` after scrolling past 260px and removes it below 40px (the gap stops flicking). `hdr-auto` uses the same slim look as `hdr-mini`. "Show tabs" while shrunk sets `hdrPinned` until the page is back at the top. While slim, the header keeps its full space as `margin-bottom` (that space is above the screen by then), so nothing below it moves. Without that, the page shifted about 180px a moment after scrolling, and map drags in `test:tokens` and `test:atlas` landed in the wrong place.
- `--hdr-live` is the header's real height (`hdrMeasure`, a ResizeObserver). `.side` and `.mb-side` sit under it and fit the screen. On laptops the side panel's Forge button (`.side>.btn.primary.wide[type=submit]`) is sticky at the bottom.
- Items: `#itFiltersBtn` folds `#itFilters` on phones (`#itForm.filters-open`, `itFiltersSync`), like the Spells tab. Show moved into the filters, and the three actions are in `.it-acts` (one row on phones). With no saved characters, `renderItTargets` links to the Characters tab.
- The Characters sheet's `.pc-actions`: Save to My characters is the only orange button. `lvBarHTML(c, true)` makes Level up plain there. Copy sheet as text is `data-pc="copy"` (`pcCopyText`). The side panel's copies (`#pcCampaign`, `#pcSave`, `#pcCopy`) are gone.
- `.grid2` uses `auto-fit`, so two sections share the full width. `.lvl` doesn't wrap. On touch screens, small buttons and chips are at least 44px.
- The parchment rules for `#genOut>.card:first-child` skip `.empty`, so the empty Adventure card keeps light text.
- Button icons: `.btn.ico` with `.ico-swords`, `.ico-hammer`, `.ico-plus`, `.ico-shop`, `.ico-dice` (CSS masks in the tabs' line style).

## The background picture (2026-11-18)

- **Design and plan:** `docs/superpowers/specs/2026-11-18-realistic-backdrop-design.md` and `docs/superpowers/plans/2026-11-18-realistic-backdrop.md`.
- **The pictures** are in `src/backdrop/`: `corridor-wide.webp` (2560 × 1429, laptops, TVs and phones on their side) and `corridor-tall.webp` (1080 × 1935, phones held upright, `max-aspect-ratio: 3/4`). Both were made with the ManyMotions image connector. The build fingerprints them as `/assets/backdrop-wide|tall.<fingerprint>.webp` and rewrites their names in the styling. They aren't in the offline install list; the service worker keeps each one once it's been shown, so a phone never downloads the wide picture.
- **`#bgScene`** shows the picture as a `50% 50% / cover` CSS background (dark `#06070e` until it arrives). The canvas on top is see-through and only draws live flames and a flickering glow on the picture's torches (`src/app/15-torch.js`). With reduced motion it draws nothing; the picture's own painted flames stay.
- **Torch positions** are fractions of each picture's width and height, in `BACKDROPS` in `15-torch.js`, and the same numbers in `PICS` in `test/e2e/backdrop.cjs`. Torches that `cover` crops off-screen get no flame.
- **To swap a picture:** run `python tools/make-backdrop.py <source> src/backdrop/corridor-wide.webp` (or `… corridor-tall.webp 1080` for the tall one), measure where the flame bases are, update `BACKDROPS` and `PICS`, then run `npm run test:backdrop` and look at it.

## Folding lists and sheet sections (2026-11-18)

- `src/app/19-fold.js`. Every `.sec` whose first child is a `.sec-h` with an `<h3>` inside `#spList`, `#itList`, `#bsList`, `#pcOut` or `#rosterMain` gets a ▾ `.fold-btn` at the right of its header. Clicking the button or the bar (not other buttons, links or fields in it) toggles `.folded`, and CSS hides everything in the section except the header.
- The key is `<list>|<first text of the h3>` (`it|Your custom items`, `sp|3rd spells`, `sheet|Skills`). Each choice is kept in `localStorage["dmforge.fold.v2"]` as `{key: true (folded) | false (open)}`; the older `dmforge.fold.v1` (a list of folded keys) is read if v2 is empty. It's a display choice, so it isn't in `BACKUP_KEYS`.
- **Starting state (owner, 2026-11-18):** a group nobody has chosen for starts folded in a list (Items, Spells, Monster Manual) with 2 or more groups. Character sheet sections start open. `foldSet` only shows; `foldChoose` shows and remembers.
- **Searching:** while `#spQ`, `#itQ` or `#bsQ` (`FOLD_SEARCH`) has text, newly drawn groups show open without changing what's remembered. The lists redraw on every search change, so clearing the search folds them again.
- Tests that click rows in these lists must open a group first (`#itList .fold-btn`), as `test:polish` does.
- A `MutationObserver` on each list re-runs `foldify` after a redraw; it's idempotent (`data-foldk` marks done sections). No render function needs to know about folding.
- Lists with 2 or more top-level groups get one `.fold-all` switch (`foldAllSync`) in the first group's title bar: Fold all, or Unfold all once every group is folded. It sits in the bar (and the buttons are 24px with negative margins) so the list doesn't move down: `test:polish` checks the phone item list starts on the first screen. The whole bar is the touch target. Character sheets (`#pcOut`, `#rosterMain`) get the switch too, in their first section's bar; on a sheet it works on every `.sec.foldable`, since the sections sit inside cards (`foldGroups`, `foldBox`).
- **Title widths (CSS):** a list title stays on one line and is cut with … only if it would leave less than 104px for the count and buttons. A sheet title keeps its full width (the hint text in its bar wraps instead) and wraps only when it's longer than the bar. `test:lorelink` checks this on a 360px phone.
- `sheetJump` calls `foldOpen` so jumping to a folded section opens it.
- Check: `npm run test:lorelink` (the folding part).

## Rulebook parchment (2026-11-23)

- **Where:** the parchment areas from before, which are generated adventures and briefs (`#genOut`), NPC cards, forged monsters and the monster builder preview. Spells, items, the Monster Manual, the character sheet and the Journal stay stone.
- **Why:** the owner chose the look from a picture of a 3.5-era rulebook page.
- **The paper** is `--book-paper` (used through `--parch`): yellowed, with soft brown mottling (the layer with `baseFrequency='.007'`, which the check looks for), faint creases and darker edges. It's all SVG noise and gradients, with no picture files and nothing from the book.
- **The ink and headings:** near-black ink in EB Garamond (open licence, loaded with the other Google Fonts), and steel-blue capital headings (Cinzel) over a thin rule.
- **The book font on stone:** spells, items, the Monster Manual, the character sheet and the Journal use EB Garamond too, in their usual stone colours.
- **The check:** `npm run test:book` checks that the parchment areas are on the paper with ink at least 4.5:1 against a stained spot, and that the other five areas stay stone in the book font.
- **To undo it,** delete the "Rulebook parchment" block at the end of `src/app.css` and the EB Garamond family in `src/index.html`'s font link. Design: `docs/superpowers/specs/2026-11-23-book-pages-design.md`.

## UI review fixes (2026-11-24)
- **Fight bar** (`#fightBar`, `fightBarSync`, `liveFight` in `05-tracker.js`): phones only, on the Tracker, while an encounter is Active with a turn set. It shows the round, whose turn and who's next, and its Next turn presses the encounter's own `[data-ea="next"]`. `body.fight-on` lifts the roll dock and the toast above it. The bottom bar's Encounter shortcut jumps to the live fight (`fightJump`).
- **Phones put the open thing first:** the Tracker's campaign list comes after the campaign (CSS `order`), and `rosterFoldPhone` (in `14-boot.js`) closes "Your characters" when a character is open. The Tracker's section links are one sideways-scrolling row.
- **Touch targets:** a `(pointer:coarse)` block makes buttons, boxes and selects at least 44 px tall (tick boxes 24 px in taller rows). Fold arrows stay narrow, because the whole title bar folds and long titles must still fit (`test:lorelink`).
- **Fight controls:** once initiative is rolled, Next turn is the gold button; Next Session and Save as template sit in `.enc-more` ("More").
- **Laptop header:** `#storeBadge`, Backup and the bell share the title's row (the nav gets `order:3; flex-basis:100%` above 600 px, not in the compact header).
- **Skip to content** (`#skipLink`, the first thing Tab reaches) focuses the active view.
- Checks: the "UI" lines in `test:qabrowser`.
