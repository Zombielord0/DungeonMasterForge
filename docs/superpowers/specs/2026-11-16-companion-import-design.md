# Import characters from the 5e Companion App: design

Date: 2026-11-16. Status: waiting for the owner's approval.

## Why

The owner's players keep their characters in the **5e Companion App** on their phones. Retyping a level 7 character into the Forge is slow and error-prone. An import button should turn the app's exported file into a working Forge character in one step. Level up, rests, dice and the sheet checks must work on it, the same as on any other character.

This is the first of four pieces, agreed in this order:
1. Companion App import (this design).
2. Homebrew classes, for classes the Forge doesn't have, such as Blood Hunter.
3. PDF character sheet import.
4. MythWeaver campaign import (.md). This waits for a sample file from the owner.

## Goals

- An **⬆ Import character** button on My Characters. It reads the Companion App's export (JSON, often with no file extension or `.cah`).
- The imported character is **rebuilt as a Forge character** through `generateCharacter`, so it behaves like a native one. (The owner picked this over copying the numbers exactly.)
- Anything the Forge doesn't know is **made into homebrew automatically**, with its rules text from the file:
  - subclass
  - species
  - background
  - feats
  - spells
- After importing, a **"What came across" summary** lists:
  - what was matched to built-in rules
  - what became homebrew
  - any numbers that differ from the app, such as AC or max HP
  - anything that couldn't be brought across
- **Players can import**, even when they're signed in and not allowed to make homebrew. Their new homebrew **waits for the DM** to approve or reject it. In the meantime the player's own character uses it. (The owner picked this option.)

## Non-goals

- Homebrew **classes**. That's piece 2. A file whose main class or a multiclass isn't one of the Forge's 12 classes stops with a plain message: "The Forge doesn't support the Blood Hunter class yet." Nothing is saved.
- Exporting back to the Companion App.
- PDF and MythWeaver imports (pieces 3 and 4).
- Keeping the app's custom dice and colour scheme.

## Anti-goals (it would be a failure if…)

- An import silently loses something. Anything dropped must be named in the summary.
- An import quietly creates shared homebrew that the DM never agreed to (in signed-in campaigns).
- A bad or unrelated file breaks the page. It should say "This isn't a 5e Companion App character" and change nothing.
- Pending homebrew leaks into other players' pickers before the DM approves it.

## What the file holds (from the owner's sample, Zook Hornraven)

The file is one JSON object, `jsonType: "character"`. Fields we use:

| App field | What it is | Goes to |
| --- | --- | --- |
| `name`, `alignmentName` (`LAWFUL_EVIL`), `exp`, `player` | basics | `name`, `align` ("Lawful Evil"), `xp` |
| `jobs[]`: `{jobId, level, archetypeId, subtypeId}` | classes in order | first is `cls`/`level`/`subclass`; the rest go to `multi` |
| `allRequiredClasses.jobs[]` (JSON strings) | full class definitions, including `archetypes[].features[{feat:{name, descriptionModels[{description, level}]}, level}]` | the text for homebrew subclasses |
| `race.raceId`, `requiredRace` (JSON string: `name, abilityScores, speed, traits, skillProficiencies, subraces, languages`) | species | a built-in species, or homebrew species |
| `background.backgroundId`, `requiredBackground` (JSON string: `name, features, skills, tools, languages, equipment, goldPieces`) | background | a built-in background, or homebrew background |
| `strength` … `charisma`: `{score, save}` | scores and save proficiency | `base` (see "Ability scores") |
| `skills[]`: `{typeName, proficiencyName: NONE/HALF/FULL/EXPERTISE}` | skills | `keepSkills`, `expertOrder` |
| `feats[]` | feats | built-in feats → `bonusFeats`; unknown ones → homebrew feat |
| `spells[]`: `{name, level, school, castingTime, range, components, duration, description, higherLevels, isRitual, classes, prepared}` | spells | `prepared`; unknown ones → homebrew spell |
| `equipment[]`: `{name, amount, isEquipped, isAttuned, description}` | gear | `inv` (matched to Items data by name where possible) |
| `platinum/gold/electrum/silver/copper` | coins | coins |
| `hp`, `tempHp` | current HP | `hpCur` (capped at the Forge's max) |
| `personalityTraits`, `ideals`, `bonds`, `flaws`, `about`, `notes[].text` | story | the matching sheet fields; `about` and notes go into the sheet's notes |
| `selectableFeatures[].selectedFeatures` (Favored Enemy, Favored Terrain, Fighting Style and so on) | feature picks | `c.choices` where a matching `CHOICES` entry exists; otherwise listed in notes and in the summary |
| `conditions`, `successes`/`failures` | play state | `conds`, `death` |

IDs follow the pattern `ranger`, `ranger_swarmkeeper_[ua]`, `folk_hero`, `mark_of_sentinel_human`. Names come from the embedded definitions (`requiredRace.name`, `archetypes[].name`). Built-in matching compares names case-insensitively, ignoring a trailing source tag such as `[PHB]`, but **keeping** `[UA]`, because a UA version isn't the published one.

## Approaches considered

- **A. Rebuild as a Forge character, auto-homebrew the unknowns (chosen).** Native behaviour: level up, rests, dice and checks all work. A few numbers may differ from the app; the summary shows them.
- **B. Copy the sheet's numbers exactly.** Matches the phone, but Level up and the automatic maths wouldn't work. Rejected by the owner.
- **C. Import only what matches built-ins and drop the rest.** Simple, but it loses content. Rejected in favour of auto-homebrew.

For players, the owner picked **"import works, and new homebrew waits for the DM"** over "players can't import new homebrew".

## How it works

### 1. Reading and mapping (`compImport(json)`)

- A pure function turns the file into `{opts, extras, homebrew[], report}`:
  - `opts` are the `generateCharacter` options: ed, cls, level, subclass, race, sub, bg, base, multi, `keepSkills`, `expertOrder`, `bonusFeats` and a seed.
  - `extras` are the stored fields applied after the build: inv, coins, prepared, story, choices, hpCur, xp, conds.
- **Rule set:** the app is 2014-based, so imports default to **2014**. The import dialog has a 2014/2024 choice, defaulting to 2014.
- **Ability scores:** see the open question below. Whichever way the app stores them, the aim is that the Forge's final scores **equal the scores the player sees in the app**. `base` = app final score − the Forge's species bonus for that species, kept between 3 and 20. A homebrew species takes its ability bonus from `requiredRace.abilityScores`.
- **Saving throws** come from the class, as in the Forge. If the app marks an extra save, such as one from Resilient, the summary mentions it.
- **Skills:** FULL and EXPERTISE pass through `pcKeep`'s mechanism (`keepSkills`, `expertOrder`), so the rebuild keeps them. HALF comes from Jack of All Trades and needs nothing extra.
- Then build: `generateCharacter(opts)`, apply `extras`, `pcEnsure`, run `pcInvUpgrade` with `kitMoved: true`, so the Forge doesn't add its own starting kit on top of the imported gear.
- Then compare the Forge's AC, max HP, speed, scores and spell DC with what the app implies, where the file allows. List any differences in the summary.

### 2. Auto-homebrew

- **Made automatically:** for each unknown subclass, species, background, feat or spell, `compImport` makes a homebrew entry in the existing shapes:
  - Subclass: `{kind:"subclass", cls, name, features:[{n, l, d}]}`.
  - Species: `{kind:"species", name, asi, speed, traits:[{n, d}], skills}`.
  - Background: `{kind:"background", name, skills, desc, gear}`.
  - Feat: `{kind:"feat", name, desc}`.
- **Who made it:** every entry gets `src: "5e Companion App"` and `ed` set to the import's rule set.
- **Already there:** if homebrew with the same name and kind already exists in the campaign, it is reused, not duplicated. A name that clashes with a built-in is never auto-made; the built-in is used.
- **Sheet effects** (`fx`) are left empty. Rules text can't safely be turned into numbers. The summary says "Swarmkeeper [UA] was added as homebrew. Its features are on the sheet as text; add any sheet effects in the Homebrew tab."

### 3. Homebrew spells (new)

- Add the kind **`spell`** to `HB_KINDS` ("Spells") and to `HOMEBREW_KINDS` in `netlify/lib/api.mjs`. That's a constant, so no database migration is needed.
- The shape matches the spell data: `{kind:"spell", name, ed, l, s (school), c (classes), t, r, cp, m, du, co, ri, d, h}`.
- `hbApply` adds homebrew spells to `SP.data[ed]` with `hb: true`, and removes them again on the next apply, like the other kinds. They show up in the Spells tab with a "Homebrew" tag. Casting, spell cards and the prepared list work unchanged, because they look spells up by name.
- The Homebrew tab gets a **Spells** section with an editor: name, level, school, classes, casting time, range, components, duration, concentration, ritual, description and at higher levels.

### 4. Pending homebrew (players signed in)

- **Who's affected:** when the person importing can't write homebrew (signed in as a player), the new entries go on the character as `c.hbPending = [entries]`. They are not sent to the campaign homebrew.
- **What the player sees:** when a character with `hbPending` loads, `hbApply` also applies those entries, flagged `pend: true` and tied to that character. Pending entries are **left out of every picker**: builder, quick forge, Feats tab, Spells browse and Homebrew list. So only that character uses them.
- **What the DM sees:** the DM's Homebrew tab gets a **"Waiting for approval"** box at the top, listing each pending entry by character ("From Zook Hornraven (Sam): Swarmkeeper [UA] subclass"). It reads the party characters that the Party tab already loads.
  - **View** shows the full text.
  - **Approve** saves the entry as campaign homebrew (`hbPut`) and removes it from the character's `hbPending`.
  - **Reject** removes it from `hbPending` and adds a note to the character ("Your DM didn't approve Swarmkeeper [UA]. Choose another subclass."). The sheet then shows the usual subclass-needed or unknown-species warning, and the player picks a replacement.
- **The Party tab:** party cards show a small "1 homebrew to approve" tag.
- **Offline and DMs:** in browser-only mode, or for the DM, there is no waiting: entries are saved as homebrew straight away.

### 5. The page

- **The button:** on My Characters, an **⬆ Import character** button sits beside the existing roster actions. It opens a small dialog with:
  - "Choose a file from the 5e Companion App"
  - a rule set choice (2014 by default)
  - a short tip: "In the app, open the character → ⋮ → Export / Share, and save the file."
- **After reading,** the dialog shows the summary before saving:
  - "Matched": Ranger 7, Folk Hero…
  - "New homebrew": Swarmkeeper [UA] subclass, Mark of Sentinel Human species. For players this says "(your DM will be asked to approve)".
  - "Different from the app": for example, AC 15 in the Forge (the app said 16), because the scale mail isn't equipped in the file.
  - "Not brought across": for example, Favored Terrain: Forest (saved in notes).
- Buttons: **Import** and **Cancel**. On Import, the character is saved and opened.
- **Wrong files:** a file that isn't a Companion App character shows "This file isn't a 5e Companion App character." A Forge character JSON or a backup gets a pointer to the right place.

### 6. Housekeeping

- A `NEWS` entry at the top: "Import characters from the 5e Companion App."
- README: a short how-to.
- CLAUDE.md: a new section with this design's functions and fields.
- `c.hbPending` and `c.importedFrom` (`{app: "5e Companion App", at}`) are stored on the sheet. They are not derived, so they stay out of the `pcLevelTo` copy list.
- `BACKUP_KEYS`: no change. Homebrew and characters are already covered.

## Testing

- `npm run test:import` (`test/e2e/companion-import.cjs`), offline, with a fixture made from the owner's sample at `test/e2e/fixtures/companion-zook.json`. It checks:
  - the name, class, level, scores, skills, background and gear
  - that Swarmkeeper [UA] and Mark of Sentinel Human become homebrew with features at the right levels
  - that a non-SRD spell becomes a homebrew spell
  - the summary's contents
  - that Level up still works on the imported character
  - that a bad file is refused with nothing saved
  - that an unknown class is refused
- An API test: a player can't PUT `kind:"spell"` homebrew, and the DM can.
- A pending-approval check through `npm run dev` with two accounts: a player imports, the DM approves, and the homebrew appears for everyone. This could be added to a Playwright check if time allows.
- `npm run test:sheet` still passes, since the generator inputs are unchanged.

## Left to the builder

- **Exact layout of the dialog and summary:** follow the existing modals (`#backupModal`, `#featModal`).
- **Mapping tables:** the app's alignment, skill and condition enums, and the subtype (fighting style) to `CHOICES` mapping. Unmapped picks go to notes.
- **Gear matching:**
  - by name, case-insensitive, with simple plural or prefix handling ("20 Arrows" → Arrows ×20; "Scalemail" → Scale Mail)
  - packs like "Dungeoneer's Pack" stay one item, as the app lists them
  - placeholder names like "Set of artisan's tools Of Your Choice" keep their text

## Open question for the owner

- **Ability scores:** in the 5e Companion App, does Zook show **STR 5** or **STR 6** (and WIS 15 or 16)? This tells us whether the file stores scores before or after the species bonus.
