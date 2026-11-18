# Spell bubbles and the spell window: design

Date: 2026-11-18. Agreed with the owner in chat (pop-up, option a). A small change: short design.

## Why

Casting already works from My Characters, but only through a tiny ✦ in front of each prepared spell. The rules text is folded away, and upcasting is hidden in a "Cast with" dropdown. The owner wants prepared spells as bubbles you tap for the full rules, with Cast spending a slot and a clear way to upcast.

## Design

- **Bubbles** (`preparedHTML`, both sheets): each prepared spell is a rounded button, `.prep-b[data-spell="ed|name"]`, showing the name plus small **C** (concentration) and **R** (ritual) marks. The ✕ remove button stays beside it. The ✦ button (`data-cast`) goes.
- **Slots per level (My Characters):** each level heading shows "N of M slots left" from `pcResources` / `resLeft`.
- **The spell window** (`castDialog(c, ed, name, {view})`, in the existing `actDialog`):
  - The rules are shown openly: level and school, time, range, components, duration, description, "At higher levels".
  - **Cast at level:** buttons `[data-castlv]`, one per usable choice: each slot level at or above the spell's ("2nd · 1 left", disabled at 0), the pact slot, ritual if the spell is one, and "Without a slot". The lowest available level is picked first. A hidden `#castSlot` keeps the value, so `castGo` is unchanged.
  - **The effect line** (`castPreview(c, sp, how)`) shows the dice, count, attack or save at the picked level, and updates when a level button is pressed.
  - With `view` (the Characters tab, where slots aren't tracked), there's no Cast section, just a note: "Save to My characters to cast and track slots."
- **Not changing:** slot counting, rests and the dice maths (`spellPlan`, `spellDice`, `castGo`).

## Approaches

The pop-up reuses the cast window (owner's pick). Unfolding inline under the bubble was rejected: it makes the sheet long and pushes everything down on phones.

## Tests (`npm run test:cast`, new)

- A bubble opens the window with the full rules.
- The level buttons show the right slots left, and a used-up level is disabled.
- Picking a higher level changes the effect line and spends that level's slot.
- A cantrip has no slot buttons.
- The Characters tab window has no Cast.
- On a phone the window fits and the bubbles are at least 44px tall.
- The remove ✕ still works.
