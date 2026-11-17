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
- **Spells on phones:** the filters sit inside `#spFilters`, closed unless `#spForm.filters-open`. `#spFiltersBtn` shows "▾ Filters · N on" (`spFilterCount`, `spFiltersSync`).
- **Grid columns** (`.layout>*`, `.tlayout>*`) have `min-width:0`, so wide content scrolls inside instead of widening the page.
- **Tests:** `npm run test:layout` (`test/e2e/layout.cjs`) runs at 390 × 640 touch, 768 × 1024 touch, 1366 × 768 mouse and 844 × 390 touch. `MOUSE_H` holds the mouse heights of the small controls, which must not change.
