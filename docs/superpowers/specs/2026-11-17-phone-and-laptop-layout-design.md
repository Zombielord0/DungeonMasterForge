# Phone and laptop layout: design

Date: 2026-11-17. Status: approved by the owner in chat.

## Why

- **The problem:** players say they can't see things at the bottom of the screen, and that things get hidden behind other things.
- **How the Forge is used:**
  - Players check their character sheets on their phones in the middle of a fight.
  - The DM runs the Dungeon Map on a laptop.
- **The goal:** both should work smoothly, with nothing hidden or out of reach.

## What was measured (phone 390 × 640, tablet 768 × 1024, laptop sizes)

- **Nothing scrolls sideways** at any width.
- **The header is sticky.** On a phone it takes about 175 px, a quarter of the screen, at all times. Content scrolls under it.
- **Pop-up windows are centred and capped at `90–92vh`.**
  - Phone browsers measure `vh` without their toolbars, so the bottom slips behind the toolbar.
  - Long windows scroll inside, with no sign of it. The Import window's **Import** button starts out of view.
- **The fixed 🎲 Rolls dock (bottom right)** covers the last control on My Characters. Toasts appear in the same place.
- **No iPhone safe-area handling.**
- **Small targets:** 68 tap targets under 32 px on My Characters, and 38 on Spells. My Characters also has 26 pieces of text under 12 px, mostly the uppercase labels.
- **Content comes after controls on phones:** Spells shows its filters before any spell.

## Approaches for the phone header (the owner chose A)

- **A. Slim header that steps aside (chosen).**
  - On phones it shows as one slim line, reusing the existing `hdr-mini` look: label, tab menu and bell.
  - It slides away while scrolling down, comes back when scrolling up a little, and stays away while a text box has the keyboard open.
- **B. A header that scrolls away and never sticks.** Simple, but changing tab means scrolling back up.
- **C. A tab bar along the bottom, like a phone app.** With 12+ tabs it needs a "More" button, it takes the bottom space we're freeing, and it's the biggest change.

## The design

### Phones (narrow screens, 600 px and under)

- **Header (A):**
  - Always the slim one-line header at 600 px and under. The tab row becomes the existing tab menu (`#hdrTabSel`).
  - It hides on scroll-down past the header's own height, and shows on scroll-up of 24 px or more, or near the top of the page.
  - It also hides while an input, textarea or select has focus.
  - The "▾ Show tabs" toggle still opens the full header on demand.
  - The sticky side panels' `top` offsets follow the header.
- **Jump bar on My Characters (owner approved the sketch):**
  - A sticky row under the header with links to the sheet's sections: ❤ HP & conditions, ⚔ Attacks, ✦ Spells (when the character has spells), 🎒 Gear, 📝 Notes.
  - Tapping one scrolls there, allowing for the header and the bar itself.
  - The bar stays visible when the header hides.
- **Spells:**
  - The list comes first. The filters sit behind a **Filters** button that shows how many filters are on.
  - The search box stays visible above the list.

### Every size

- **Pop-up windows:**
  - Sized to the visible screen (`dvh`, with a `vh` fallback), less the safe areas.
  - The content scrolls inside the window. The button row is pinned to the bottom of the window, so Import, Cancel, Level up and Close are always visible.
  - Applies to: `#modal`, `#backupModal`, `#impCharModal`, `#lvModal`, `#featModal`, `#choiceModal`, `#actModal`, the What's new panel and the other full-screen overlays.
- **Fixed things at the bottom:**
  - Pages get bottom padding equal to the Rolls dock's height plus a gap, so the last control can always be scrolled clear of it.
  - Toasts appear above the dock, not on top of it.
- **Safe areas:** `viewport-fit=cover` with `env(safe-area-inset-*)` padding on the header, the dock, toasts and pop-ups.

### Touch screens (`pointer: coarse`)

- **Tap size:** buttons, checkboxes, selects, chips and − / + counters get at least 40 × 40 px of tap area (padding or `min-height`/`min-width`).
- **Computers with a mouse look exactly as they do now.**
- **Text:** uppercase labels go from 11.5 px to at least 12.5 px on touch screens.

### Laptop (1366 × 768) and the Dungeon Map

The DM's laptop view stays as it is. The work here is checking that the map, the TV and fog tools, and the room key fit at 1366 × 768 with nothing cut off or hidden, and fixing whatever is.

## Non-goals

- A bottom tab bar.
- Redesigning any page's look on computers.
- New features beyond the jump bar and the Spells filter toggle.

## Anti-goals

- The laptop map view getting worse.
- The header hiding when someone needs it, such as at the top of a page or when they scroll up.
- Any control becoming unreachable, with a pop-up's buttons out of view at any size.

## Testing

A new `npm run test:layout` (Playwright, any OS) runs at 390 × 640 (touch), 768 × 1024 (touch) and 1366 × 768 (mouse). It checks:

- no sideways scrolling on any tab
- every pop-up's buttons are inside the visible screen without scrolling the window
- at the end of each long page, no fixed element covers a control
- tap targets of the key controls are at least 40 px on touch screens
- the phone header hides on scroll-down and returns on scroll-up
- the jump bar links land each section below the header and bar
- the Spells list is visible before the filters on a phone

The existing feature checks must stay green. Then one preview build goes up for the owner to try on a real phone.

## Left to the builder

- Exact sizes, colours and icons, in the existing style.
- The jump bar's section ids.
- The scroll thresholds within the numbers above.
