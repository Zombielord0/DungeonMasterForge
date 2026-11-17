# MythWeaver campaign import: design

Date: 2026-11-17. Status: waiting for the owner's approval.

## Why

- **The situation:** the owner runs their campaign ("Undead Titan") in MythWeaver and wants it in the Forge's Campaign Tracker without retyping it.
- **What's in it:**
  - 14 sessions with recaps
  - 63 NPCs
  - 47 locations
  - over 100 other lore entries
  - a player character
  - picture links
- **The source:** MythWeaver exports the whole account as one JSON file.

Earlier decisions with the owner:
- **Order:** this was piece 4 of the import work.
- **Lore:** option A, a new **Lore** section in each Tracker campaign, rather than squeezing it into Notes.
- **NPC pictures:** each NPC gets a picture frame, which is done. MythWeaver picture links fill it.
- **Screen size:** the layout must work on phones and the laptop, which is done.

## What the file holds (the owner's export, 2026-11-16)

`{format: "mythweaver-account-export", version: 1, exportedAt, account, campaigns[], otherLore[], characters[], images[]}`

- **`account`:** id, email, username, name and plan. This is personal data: never stored, shown or committed.
- **`campaigns[]`:** `{id, name, description, gameSystem, status, createdAt, lore[], sessions[]}`.
  - **`lore[]`:** `{id, name, type, description, imageUrl?, tags?, sections[{title?, text, dmOnly?}], createdAt, updatedAt}`.
    - Types in the sample: generic 105, npc 63, location 47, item 8, monster 5, encounter 1.
    - Section text is markdown, except 17 sections that are HTML (`<p>`, `<h3>`, `<ul>`, `<strong>`). 20 sections are `dmOnly`.
  - **`sessions[]`:** `{id, number, name, playedOn, summary, shortRecap, detailedRecap, createdAt}`, with markdown text.
- **`otherLore[]`:** lore not tied to a campaign (6 items in the sample).
- **`characters[]`:** `{id, name, ancestry, class, level, gameSystem, campaignIds[], sheet: {name, level, abilityScores{str…cha}, selectionsBySlot{class, species, background, class_skills[], ability_method, …equipment…, background_language_choices[]}}}`.
  - **Scores are base scores.** Sarth Veyl's are 15/14/13/12/10/8 with `ability_method: "standard_array"`, so the species bonus is added by the rules on top. This is the opposite of the Companion App.
- **`images[]`:** 534 entries of `{id, url, prompt, campaignId, name?}`. They're web links to `assets.mythweaver.co`, not the pictures themselves.

## Goals

- **The button:** the Tracker's **Import JSON** button becomes **⬆ Import campaign**. It reads Forge campaign files as before, and also MythWeaver exports, detected by `format: "mythweaver-account-export"`.
- **The import window** lists the file's campaigns (ticked) and characters (ticked when they belong to a ticked campaign). It shows counts and what goes where, then imports.
- **For each campaign:**
  - **Name and description** → the Tracker campaign's name and overview notes.
  - **Sessions** → Sessions, as `{title, num, date, summary}`. The summary is the detailed recap, or else the summary, or else the short recap. Markdown becomes readable plain text.
  - **NPC lore** → NPCs:
    - **name**
    - **role:** from a "Role" or "Occupation & Role" section's first line, else the first few words of the description
    - **attitude:** "Unknown"
    - **notes:** the description plus each section as "Title: text", with DM-only sections marked "(DM only)"
    - **picture:** `imgUrl` from `imageUrl`
    - tags kept as notes.
  - **Every other lore entry** → the new **Lore** section, keeping its type, tags, picture link, description and sections (with DM-only marks).
  - **`otherLore[]`** goes into the Lore of every imported campaign, tagged "Account".
- **Characters** go to **My Characters** through the existing import pipeline (`importBuild`, homebrew rules and DM approval). They're built from the class, species, background, base scores (`base`, not `final`), class skills and level.
  - Rule set: `gameSystem` "dnd.5e.1" means 2014, with a 2014/2024 choice in the window.
  - Unknown class, species or background names follow the existing rules: refused, or made into name-only homebrew.
- **Importing again** (owner can override):
  - A Tracker campaign that came from the same MythWeaver campaign (`c.mwId`) is **updated in place**. Imported NPCs, lore and sessions are matched by their MythWeaver ids and refreshed, new ones are added, and anything the DM made in the Forge is kept.
  - The window says "Updates <name> (imported on <date>)".
  - Characters are skipped if one with the same MythWeaver id is already in My Characters.

## The Lore section (new Tracker tab)

- **Where:** a **Lore** tab in each campaign, between NPCs and Quests, with a count.
- **Layout:**
  - A search box (name, tags and text) and type chips: All · Places · Items · Monsters · Encounters · Other, each with counts.
  - Entries are cards, collapsed to show the picture (small), name, type and tags. Tapping one opens its description and sections.
  - DM-only sections carry a 🔒 DM only tag (the whole Tracker is DM-only, but the mark helps when reading aloud).
- **Editing:**
  - **+ Add entry**, and an **Edit** mode on each card: name, type, tags (comma separated), picture link (https), description, and sections (title and text, each with a DM-only tick, plus add and remove).
  - **📺 TV** on an entry with a picture shows it on the player screen, like NPC pictures (only the picture).
  - Delete asks first.
- **Text display:** escape everything, then render a safe subset of markdown: `**bold**`, `*italic*`, `#`/`##`/`###` headings, `- ` and `1. ` lists, and paragraphs. HTML from MythWeaver is converted to the same plain-text-plus-markdown when importing.
- **Data:** `c.lore = [{id, mwId?, name, type: "place"|"item"|"monster"|"encounter"|"other", tags[], imgUrl?, desc, sections:[{t, x, dm}], src?}]`.
  - MythWeaver types map as: location→place, item→item, monster→monster, encounter→encounter, generic→other.
  - Existing campaigns get `lore: []` on load. Forge campaign exports and imports carry `lore`.
- **Phones:** the cards stack, and the chips scroll sideways like the jump bar.

## Storage

- **The cost:** the sample campaign's lore is about 1.4 MB of text, and the Tracker keeps campaigns in the browser (about 5 MB for the whole site).
- **Warning first:** before importing, the window shows the size and the space left, and warns if it won't fit. If saving fails, nothing is half-imported: the campaign is removed again, and the window says so.
- **Backups:** lore lives inside the campaign, so it's in the 💾 Backup file and in Forge campaign exports.

## Non-goals

- The 534 images in `images[]` that aren't attached to a lore entry. The summary says "534 MythWeaver pictures aren't imported; they stay in your MythWeaver account".
- Turning MythWeaver monster text into Forge stat blocks, or encounters into Forge fights.
- Two-way sync with MythWeaver.

## Anti-goals

- The account's email or name ending up anywhere in the Forge.
- A failed import leaving a half-made campaign.
- Re-importing wiping things the DM added in the Forge.

## Testing

- **Fixture:** `test/e2e/fixtures/mythweaver-sample.json`, a made-up export with the same shape. It has two campaigns, each lore type, HTML and markdown sections, DM-only sections, sessions, a character and `otherLore`. Its account details are fake. The owner's real export is never committed.
- **`npm run test:mythweaver`** checks:
  - the mapping: counts, NPC role and notes, lore types, the HTML-to-text conversion, session text, and the character's scores with base plus species bonus
  - that the account details aren't stored anywhere in `localStorage`
  - the Lore tab: search, type chips, open and close, edit and save, add and delete, and the TV picture
  - re-import: updates in place, keeps a Forge-added NPC, no duplicates
  - the storage warning and the rollback on a quota failure (simulated)
  - the phone layout (no sideways scrolling, buttons on screen)
- **The owner's real export** is tried locally, not committed. Its counts are recorded in the ledger.
- **Existing checks:** `test:backup`, `test:layout`, `test:import` and `test:npcpic` stay green.

## Left to the builder

- The exact window layout, card styling and chip icons, in the existing style.
- Where the role is taken from when no role section exists.
- The markdown subset's edge cases.
