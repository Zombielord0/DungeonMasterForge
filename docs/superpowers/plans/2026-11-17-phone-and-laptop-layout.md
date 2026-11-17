# Phone and Laptop Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** nothing on the Forge is hidden or out of reach on a phone or a laptop. That means pop-up buttons always visible, a slim self-hiding phone header, bottom space clear of the Rolls dock, finger-sized touch targets, a jump bar on the phone sheet, a list-first Spells tab on phones, and the map checked at laptop size.

**Architecture:**
- Mostly CSS in `public/index.html`: media queries for `max-width:600px` and `pointer:coarse`, and `dvh`/`env(safe-area-inset-*)` sizing.
- Small JS for the scroll-aware header, the sheet jump bar and the Spells filter toggle.
- One new Playwright check measures layout at three sizes.

**Tech Stack:** vanilla HTML/CSS/JS in `public/index.html`, and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-phone-and-laptop-layout-design.md`

## Global Constraints

- **Phone layout:** at `max-width:600px`. **Touch sizing:** under `(pointer:coarse)` only. Computers with a mouse must look as they do now.
- **Tap targets on touch:** at least 40 × 40 px. Uppercase labels at least 12.5 px on touch.
- **Header:**
  - hides after scrolling down more than its own height
  - shows again on scroll-up of 24 px or more, or within 80 px of the top
  - hides while an `input`/`textarea`/`select` has focus
  - phones only
- **Pop-ups:** height capped at `calc(100dvh - 24px)` (with a `vh` fallback line before it), and the button row pinned to the bottom.
- **New check** at 390 × 640 touch, 768 × 1024 touch and 1366 × 768 mouse: `npm run test:layout`.
- **Wrap-up:** add a `NEWS` entry and notes in CLAUDE.md. Push once at the end, for one preview build.

## Review Focus

- **Scrolling up just a little in a long sheet** (under 24 px) → the header stays hidden, with no flicker. The check scrolls up 10 px and expects it still hidden.
- **Rotating a phone to landscape** (844 × 390) → windows still fit, with buttons visible. The check runs the pop-up probe at 844 × 390 too.
- **A pop-up opened while the header is hidden** → the window is still centred and fully visible. The check opens the Import window after scrolling down.
- **The keyboard closing** (focus leaves the input) → the header can come back on the next scroll-up. The check blurs, scrolls up and expects it shown.
- **The full header opened with "▾ Show tabs" on a phone** → it doesn't auto-hide until the user scrolls down again. The check toggles it and expects it shown.

---

### Task 1: The layout check

**Files:**
- Create: `test/e2e/layout.cjs`. It starts its own static server like `test/e2e/tv.cjs`, runs offline, and seeds a level 5 Wizard and a campaign with an NPC.
- Modify: `package.json` (`"test:layout": "node test/e2e/layout.cjs"`)

**Interfaces:**
- Produces: `test:layout`. Later tasks add nothing to its interface and only make its checks pass.

- [ ] **Step 1: Write the check.** Names and assertions:
  - `"<size>: no sideways scrolling on #<tab>"`: `scrollWidth - clientWidth <= 0` on every tab in `generate npc monsters character roster spells feats items map tracker homebrew`, at all three sizes.
  - `"<size>: <window> buttons are on screen"`: for the Import window with the Zook summary, Level up, Backup, a `confirmBox` and the What's new panel. The last visible button's rect is inside `[0, innerHeight]` without scrolling the window. Run at all three sizes plus 844 × 390.
  - `"<size>: end of #<tab> isn't covered"`: after scrolling to the bottom of roster, spells, tracker, map and items, no visible fixed element overlaps an interactive control in `.view.active`.
  - `"phone: header hides on scroll-down"` / `"…returns on scroll-up"` / `"…stays hidden on a 10 px scroll-up"` / `"…hides while typing"` / `"…Show tabs keeps it open"`: read `document.documentElement.classList.contains("hdr-away")`.
  - `"touch: <selector> is at least 40px"`: on `[data-res]` −/+ counters, `.cond-btn` (or the actual condition button class), the spell level chips, checkboxes inside `label.check`, and `.btn.sm`. Every visible one has a `getBoundingClientRect` width and height of 40 or more, at 390 and 768 touch.
  - `"mouse: <selector> keeps its size"`: at 1366 mouse, the same selectors' heights equal the values recorded before the change. Record them in the test as constants from a run on the current code.
  - `"phone: labels are at least 12.5px"`: on `.rc-grid label`.
  - `"phone: jump bar goes to <section>"`: My Characters has `#sheetJump` with links for hp, attacks, spells, gear and notes. After tapping each, the target's top is at or below the bar's bottom and within 120 px of it.
  - `"phone: spells list first"`: on #spells, the first `.sp-row` is within the first 1.5 screens, and `#spFiltersBtn` exists and toggles the filters.
  - `"laptop: map tools fit"`: at 1366 × 768 on #map, after Generate and Start TV, `#fogTools`, the canvas and the first Room Key entry are each reachable. Each has a visible box and none is covered by a fixed element.
- [ ] **Step 2:** Run `npm run test:layout`. Expected: FAIL on the window buttons, the end-of-page cover, the header, touch sizes, the jump bar and the spells checks; sideways scrolling passes.
- [ ] **Step 3:** Commit: "Layout check at phone, tablet and laptop sizes".

### Task 2: Pop-ups fit the screen with their buttons showing

**Files:** Modify `public/index.html`: the modal CSS around lines 316–346, 427, 683, 823 and 907, and the box rules for `#modal`, `#backupModal`, `#impCharModal`, `#lvModal`, `#featModal`, `#choiceModal`, `#actModal`, `#newsPanel` and the overlay at 427/683.

- [ ] **Step 1: Implement.**
  - Each `.box` is a flex column with `max-height: calc(100vh - 24px); max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); overflow:auto`.
  - Its final button row (`.row:last-child`, or the existing footer element) gets `position:sticky; bottom:0`, the box's background, and a top border.
  - The overlays keep `align-items:center`. Their padding becomes `max(12px, env(safe-area-inset-*))`.
  - Add `viewport-fit=cover` to the viewport meta in `index.html` and `player.html`.
- [ ] **Step 2:** Run `npm run test:layout`. Expected: every "buttons are on screen" check passes.
- [ ] **Step 3:** Run `npm run test:import`, `npm run test:backup` and `npm run test:hbpend`. Expected: all pass.
- [ ] **Step 4:** Commit: "Pop-up windows fit the screen with their buttons showing".

### Task 3: Bottom space, toasts and the phone header

**Files:** Modify `public/index.html`: the header CSS (lines 45, 361, 482 and 749–757), the 600 px block at 799, `.roll-dock`, `#toast`, `hdrSync`, and a new `hdrAuto()` script near `hdrSync`.

**Interfaces:**
- Produces: the class `hdr-away` on `<html>` while the phone header is hidden. The jump bar (Task 5) uses it for its `top`.

- [ ] **Step 1: Implement.**
  - **Bottom space:** `main` (the view container) gets `padding-bottom: calc(76px + env(safe-area-inset-bottom))`. `.roll-dock` and `#toast` add `env(safe-area-inset-bottom)` to their bottom offset. The toast sits above the dock (`bottom: calc(80px + env(safe-area-inset-bottom))` when the dock is shown).
  - **Phones:** `header` gets the `hdr-mini` presentation via the media query, without changing the stored `dmforge.hdrMini` setting. It also gets `transition: transform .2s`, and `.hdr-away header{transform:translateY(-100%)}`.
  - **`hdrAuto()`:** a passive `scroll` listener, active only when `matchMedia("(max-width:600px)")` matches, using the thresholds in Global Constraints. `focusin`/`focusout` on form fields set and clear a `typing` flag that forces `hdr-away`. "▾ Show tabs" clears `hdr-away` until the next downward scroll past the threshold.
  - The sticky side panels' `top` follows the header (58 px), or 8 px when `hdr-away`.
- [ ] **Step 2:** Run `npm run test:layout`. Expected: the end-of-page and all header checks pass.
- [ ] **Step 3:** Run `npm run test:tv` and `npm run test:map` (rerun `test:map` once if it fails on timing, as noted in CLAUDE.md). Expected: pass.
- [ ] **Step 4:** Commit: "Phone header steps aside; nothing covers the end of a page".

### Task 4: Finger-sized touch targets and readable labels

**Files:** Modify `public/index.html`: a new `@media (pointer:coarse)` block after the 600 px block.

- [ ] **Step 1: Implement.** Inside `@media (pointer:coarse)`:
  - `min-height: 40px` and `min-width: 40px` (with padding, not font changes) for `.btn.sm`, `.icon-btn`, the −/+ resource buttons, the condition buttons, the spell level chips and the roll-dock buttons.
  - Checkboxes in `label.check` get a 40 px label row.
  - `.rc-grid label` and the other uppercase field labels get `font-size: 12.5px`.
  - Use the class names the Task 1 check found.
- [ ] **Step 2:** Run `npm run test:layout`. Expected: the touch and label checks pass, and the mouse sizes are unchanged.
- [ ] **Step 3:** Run `npm run test:sheet` and `npm run test:npcpic`. Expected: pass.
- [ ] **Step 4:** Commit: "Finger-sized buttons on touch screens".

### Task 5: Jump bar on the phone sheet, and the Spells list first

**Files:** Modify `public/index.html`: `renderRosterMain` (section anchors and `#sheetJump`), the Spells view markup near line 1375 (`#spFiltersBtn`, a wrapper `#spFilters`), and CSS.

**Interfaces:**
- Consumes: `hdr-away` (Task 3).
- Produces: `#sheetJump a[data-jump="hp|attacks|spells|gear|notes"]`, and section ids `sec-hp`, `sec-attacks`, `sec-spells`, `sec-gear` and `sec-notes` on the sheet's existing section cards.

- [ ] **Step 1: Implement.**
  - **`#sheetJump`:** shown only at `max-width:600px`. It's `position:sticky`, with `top` equal to the header's height, or 0 when `hdr-away`.
  - Taps call `scrollIntoView` with `scroll-margin-top` on the sections, set to the bar height plus the header height.
  - Leave out the Spells link when the character has no `spell`.
  - **Spells at 600 px and under:**
    - `#spFilters` (everything but the search box and edition) starts closed.
    - `#spFiltersBtn` reads "Filters" plus "· N on" when any filter is set, and toggles it.
    - On computers the filters stay open, and the button is hidden.
- [ ] **Step 2:** Run `npm run test:layout`. Expected: the jump bar and spells checks pass.
- [ ] **Step 3:** Commit: "Jump bar on the phone sheet; Spells list first on phones".

### Task 6: Laptop map, notes and the preview

**Files:**
- Modify `public/index.html`: any map or fog-tool CSS the laptop check flags, and `NEWS`.
- Modify `README.md` and `CLAUDE.md`, the latter with a "Phone and laptop layout" section plus `test:layout` in Commands.

- [ ] **Step 1:** Run `npm run test:layout` and fix whatever the "laptop: map tools fit" check flags. Expected: the whole check passes.
- [ ] **Step 2: `NEWS`:** id `2026-11-17-layout`, title "Easier on phones", `go: "roster"`. Items:
  - "Pop-up windows always fit your screen, with their buttons showing."
  - "On phones the header gets out of the way while you scroll, and comes back when you scroll up."
  - "My Characters has a jump bar on phones: tap HP, Attacks, Spells, Gear or Notes."
  - "Bigger buttons on touch screens."
  - "Spells shows the list first on phones, with the filters behind a Filters button."
- [ ] **Step 3:** Run every check: `npm test`, plus `test:layout`, `test:import`, `test:hbpend`, `test:hbspell`, `test:npcpic`, `test:sheet`, `test:backup`, `test:tv`, `test:map`, `test:mapvis`, `test:tokens` and `test:cards`. Expected: all pass.
- [ ] **Step 4:** Commit, then push once. The PR #9 deploy preview rebuilds.
