# Boss and lair encounters
Open Campaign Tracker → Encounters → Run fight → Boss & lair → Configure. Choose the owner or Environmental encounter. The configuration is a visual form with an optional editable JSON object; import/export is local and does not overwrite other campaign data. A monster's named lair actions seed a new kit. Configure at the start of a fight for best results.

Initiative defaults to 20, losing ties. The Next turn button pauses at the boundary and requires choosing or skipping a lair action. A clock marked auto advances when combat wraps to the next round. Legendary actions reset on the owner's turn. Phases latch when the owner crosses an HP threshold; descriptions are reminders, not automatic stat changes. Objects are not combatants or XP. Damage threshold is checked on each entered damage instance; the DM adjudicates damage type/immunity. Use existing condition, save, spell and map tools for effects. Undo, save and encounter reset cover kit state. Editing configuration resets the kit, and exported JSON is configuration only. Player-facing map markers and clocks are opt-in; no private mechanics or HP are sent.

Example JSON:
```json
{
  "app": "dmforge-boss-kit",
  "v": 1,
  "name": "Ritual chamber",
  "initiative": 20,
  "repeat": false,
  "legendary": 2,
  "resistance": 1,
  "slots": [
    4,
    3,
    3,
    3,
    2,
    1,
    1,
    0,
    0
  ],
  "objects": [
    {
      "id": "crystal",
      "name": "Crystal",
      "ac": 17,
      "hp": 30,
      "threshold": 5,
      "dc": 17,
      "immunities": "poison, psychic",
      "text": "Disable with an action and successful Arcana check."
    }
  ],
  "actions": [
    {
      "id": "pulse",
      "name": "Pulse",
      "requires": "crystal",
      "text": "DC 16 Dexterity save or 2d8 force damage.",
      "uses": 0
    },
    {
      "id": "heal",
      "name": "Mend",
      "requires": "crystal",
      "text": "DM checks eligibility before use.",
      "uses": 1,
      "heal": 10
    }
  ],
  "clocks": [
    {
      "id": "ritual",
      "name": "Ritual",
      "max": 6,
      "auto": true,
      "text": "Stop by sabotage."
    }
  ],
  "phases": [
    {
      "id": "second",
      "name": "Second phase",
      "hp": 100,
      "text": "Speed increases to 40 ft."
    }
  ],
  "powers": [
    {
      "id": "breath",
      "name": "Breath (recharge 5–6)",
      "max": 1,
      "reset": "manual",
      "text": "Roll at start of turn; restore on success."
    }
  ],
  "regional": "The ice grows northward."
}
```

Current limits: no automated spell resolution, automatic area targeting, PC condition expiry tied to lair actions, regional simulation or player-phone overlays. This is a general encounter tool, not an automatic rules engine.

Monster Bulk Import JSON rows can include a structured `boss_kit` object and `legendary_actions_per_round`. The monster editor also accepts an optional boss-kit JSON and saves it with the monster. Open a fight, select the monster, and Configure seeds its kit. Encounter templates preserve configuration with the owner remapped to the copied enemy. A plain stat block can include a Lair Actions heading followed by named actions. Exported kits omit the encounter-local owner ID; choose the owner at import.

The encounter configuration dialog now has editable fields for all mechanic types. Advanced JSON remains available. Action `delay` and `duration` are measured in initiative-count occurrences; scheduled/expiring effects are displayed as reminders at the lair panel. Use existing tools to actually apply and remove conditions. Objects and completed counters can stop a clock automatically (`stopOnObjects`, `stopOnClocks` lists of IDs). Stopped clocks do not automatically resume. 

## Map and TV
Open the relevant Dungeon Map, then Run fight and Link open map in the boss panel. In Edit / import, objects and timed actions have optional zero-based grid column/row fields; timed actions can use a radius in squares. Set explicit coordinates for markers and check Show marker to players only for known objects/effects. Markers paint beneath fog, and appear for the linked map when this encounter is selected for TV. For clocks, use Show clock to players and a short public label. Only the public label and progress are drawn on the TV, never private rules or HP. No automatic target selection or freehand placement; the DM can use existing map tools for unconfigured or multiple effect areas. The player phone feed is unchanged. Link and visibility are opt-in.
