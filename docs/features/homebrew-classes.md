# Homebrew classes (2026-11-17)

A DM can add a class the Forge doesn't have (Blood Hunter, Gunslinger…) in the Homebrew tab, and imports with an unknown class make one instead of being refused.

## Data
A homebrew entry `kind: "class"` (also in the API's `HOMEBREW_KINDS`; a class may be 6× the usual 50 KB):
`{ id, kind, name, ed, desc, src?, hd, pri: [a, a?], saves: [a, a], skills: {n, any, from: [skills]}, armor: ["light"|"medium"|"heavy"|"shield"], weapons, tools, kit (comma list), wpn: {n, d, ab}, cast: "none"|"full"|"half"|"pact", castAb?, spellsFrom?, subName, subLv, features: [{l, n, d, fx}] }`

## How it plugs in (src/app/07-character-generator.js)
- `hbApply()` merges each homebrew class (pending ones too, marked `pend`) into `CLASS_DATA` via `hbClassData(x)`, which gives the built-in shape: `hd, pri, saves, skills: [list, n], ac (10 + Dex), kit, wpn, f: {level: [names]}, sub: [subName, subLv], asi, cast?` plus `hb: true`, `hbx` (the entry), `spellsFrom`, `armorT`, `weapons`, `tools`. Removed again on the next `hbApply` (`HB.applied.classes`). It never replaces a built-in name. Feature text goes into `HB_DESC`.
- `classList(ed)` = built-ins plus homebrew for that rule set, without pending ones. It's used by the builder, the quick forge's `#pcClass` (`fillClasses`, refreshed by `pcSelectsRefresh` and the edition radios) and the multiclass window. **Random picks use `builtInClasses()`**, so random characters stay the same.
- `subclassLevel` uses the homebrew class's own level in both rule sets. Homebrew subclasses can name the class.
- `hbEffects` adds the `fx` of the class features reached.
- Spells: `clsSpellList(cls)` is `spellsFrom` (a built-in caster's list) or the class itself; `pcSpellPool` and the "isn't on the list" warning use it. `spellLimits`: a homebrew half caster prepares ability mod + half its level, others mod + level; cantrips follow the chosen list's class (or 2).
- Proficiencies: `armorTraining` reads `armorT`; `profInfo` reads `weapons`/`tools`; the Characters tab's line is built from them. Multiclass prerequisite: 13 in its main ability (`mcPrereq`).
- Rejecting a waiting class keeps it on the character (like species and backgrounds, `hbReject`).

## Editor (src/app/12-level-homebrew-feats.js)
`hbNew("class")`, `hbDraftOf` / `hbItemOf` (flat draft fields `skN`, `skFrom`, `skAny`, `wpnN/D/Ab`), `hbProblem` (main ability, two saves, enough skills ticked), the form in `hbFormHTML`, ticks `[data-hbsk]`, `[data-hbskany]`, `[data-hbarm]`.

## Import (src/app/16-character-import.js)
`impClass(ed, name, def, D, src, saves)` reuses a homebrew class of that name, or adds one to the draft. From the Companion App's class it takes the hit die, saves, skill choices, armour/weapon/tool training, first equipment choices, class weapon, caster type and ability, subclass level and every feature with its text. PDF (with the sheet's ticked saves) and MythWeaver make a sketch "to fill in". The class's subclass becomes a homebrew subclass for it.

## Tests
`npm run test:hbclass` (`test/e2e/homebrew-class.cjs`) and the Blood Hunter checks in `npm run test:import`.
