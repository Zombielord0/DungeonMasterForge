# The fight window: conditions, saves and concentration (2026-11-25)

## Why
The owner wants to set conditions on enemies and on players during a fight, picked from a list ("Goblin 1 prone, Player 1 stunned"). They also want reminders for concentration and for spells' saving throws. Seeing the plan, they asked whether one full-screen encounter window, with the players' health and the monsters together, would be better. It would. The mockup was approved, and so was how spells are tracked: who cast it, the save DC from the caster, the rest from the spell.

## What gets built
**A fight window** (`05b-fight.js`). Each encounter card gets **▶ Run fight**, which opens a full-screen window over the Tracker. **✕ Close** goes back. Everything is saved on the encounter.
- **Top bar:**
  - the name and round;
  - 🎲 Roll enemy initiative and the heroes' initiative boxes, until it's rolled;
  - 📺 Show on TV;
  - Undo;
  - **Next turn ▶**.
- **The reminder strip:** the oldest unanswered reminder, waiting for **Saved / Failed** (or **Kept / Lost** for concentration). It doesn't time out (owner's choice), and the count of any others is shown.
- **Turn order (left):** everyone, foes and heroes, sorted by initiative (anyone without one goes last).
  - Each row has: an HP bar, AC and HP, and condition chips with ✕.
  - A concentration tag ◎ shows on anyone concentrating.
  - A quick **+ Condition** list adds a condition that lasts until removed.
  - Damage and heal boxes: for foes they use the encounter's own damage, and for heroes the Party box's damage, which goes onto their sheets.
  - Clicking a row selects that creature for the middle. The current turn is selected after each Next turn.
- **Middle:** the selected creature.
  - For a foe: its stat block.
  - For a hero: AC, HP, spell save DC, concentration, conditions, and a link to the sheet.
  - Under it, **Add a condition**:
    - the condition (the 15, plus Exhaustion);
    - **Ends:** until removed; with a save at the end of each of its turns; with a save at the start of each of its turns; after N rounds; at the end of its next turn; at the start of its next turn;
    - the save ability and DC;
    - the caster (anyone in the fight, or Other);
    - the spell (the caster's own spells first: a hero's prepared spells, or the spells named in a monster's stat block);
    - **Concentration** (ticked when the spell needs it).
- **Right:** the party at a glance, concentration in the fight, and the log (the combat history).

**Filled in for you** (all can be changed before Add):
- **The DC comes from the caster:**
  - a hero's spell save DC (`c.spell.dc`);
  - for a monster, "spell save DC N" in its stat block, or else the first "DC N";
  - otherwise you type it.
- **The spell's save ability** comes from the spell data (`sv`), or else from the "… saving throw" wording.
- **The condition** is the first condition named in the spell's text.
- **How it ends:** "end of each of its turns" gives a save at the end, and "start of each of its turns" a save at the start.
- **Concentration** comes from the spell data (`co`).
- **The duration in rounds:** 1 minute is 10 rounds and 10 minutes is 100.

**Where conditions live:**
- **Foes:** `m.conds`, a list of `{id, k, ends, save: {ab, dc}, src: {by, name, spell}, castId, untilRound, seenStart}`. The old free-text `m.cond` stays as a note and shows as a chip.
- **Heroes:** the condition goes on the character sheet (`c.conds[k]`), as the sheet's own buttons do. Saving goes through `pcPersist`, so signed-in players see it. The fight keeps the details (`e.pcConds[partyId]`). Removing a fight condition clears the sheet flag, unless another fight condition holds the same one.
- **Casts:** `e.casts[castId] = {by, spell, pcId?}`.
  - A foe concentrating has `m.conc = {spell, castId}`.
  - A hero uses the sheet's `c.conc` (through `concStart`).
  - A new concentration spell by the same caster ends their last one.

**Reminders** (`e.prompts`):
- **Next turn:**
  - at the end of the outgoing creature's turn: its "save at end" conditions ask, and its "end of its next turn" conditions end (once it has had a turn since);
  - at the start of the incoming creature's turn: its "save at start" conditions ask, and its "start of its next turn" conditions end;
  - when a new round starts, conditions whose rounds have run out end, with a note.
- **Saved** removes the condition, and **Failed** keeps it.
- **Damage to a foe that's concentrating** asks "CON save DC max(10, half the damage)": **Kept** or **Lost**. **Lost**, or the foe dropping to 0 HP, ends the cast, removing every condition from it (foes and heroes) with a note.
- **A hero's concentration:** the sheet already sets `concCheck` when they take damage. The window shows it as a Kept / Lost reminder. If a hero's concentration ends anywhere (the sheet, a long rest, Lost), the conditions from that cast are removed the next time the window draws.

**Undo** covers foes' conditions and concentration, reminders and casts. Heroes' conditions are on their sheets and aren't undone; they're removed with ✕.

**Unchanged:** what the TV and players' phones get (names, whose turn, Bloodied or Down: no conditions, no HP). The encounter card keeps planning a fight, and its Conditions box keeps working for notes.

## Constraints
- Reuse the existing actions (`data-ea` and `data-ef` on `#campMain`, `actApply` for heroes). The window lives inside `#campMain`, and `renderTracker` and `rerenderEnc` redraw it when it's open.
- `esc()` on every name, spell and note: heroes' names and spells come from players' sheets.
- Phones: the columns stack, with the turn order first.

## Check
`test:fight`:
- opening and closing the window;
- a quick condition on a foe and on a hero, the hero's showing on their sheet;
- Hold Person from a hero filling in WIS, Paralyzed, the DC from the sheet and concentration;
- an end-of-turn save reminder on Next turn, Saved removing it;
- damage to a concentrating foe asking for a save, Lost ending its cast's conditions;
- a hero losing concentration on the sheet freeing the target;
- rounds expiring;
- Undo;
- names shown as text;
- a phone.
