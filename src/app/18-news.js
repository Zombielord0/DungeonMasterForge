/* 18-news.js: What's new (the bell) and Install app.
   When a change ships, add an entry to the top of NEWS with a new id, in plain words for players and DMs. */

const NEWS = [
  { id: "2026-11-23-reference-spells", date: "2026-11-23", title: "More spells, and Oathbreaker abilities", go: "spells", items: [
    "Spells from other D&D books, like Silvery Barbs, are now in the 2014 spell list with their level, casting time, range, components, duration and the book page to look them up. Imported characters keep them.",
    "Oathbreaker paladins see Aura of Hate, Control Undead and Dreadful Aspect in their Abilities list, with their save DCs. The Channel Divinity options use the Channel Divinity counter."
  ] },
  { id: "2026-11-23-change-subclass", date: "2026-11-23", title: "Change a character's subclass", go: "roster", items: [
    "A Change button now sits next to the subclass on every character sheet. Pick a different subclass, such as the book's Oathbreaker instead of an old homebrew copy, and the sheet swaps in its features while keeping the level, scores and choices."
  ] },
  { id: "2026-11-23-qa-fixes", date: "2026-11-23", title: "Monster and import fixes", go: "monsters", items: [
    "Horses, mules, camels, the elephant and other 2014 animals no longer show a long list of +0 saves and skills.",
    "The 2014 Donkey now has its hit dice and an attack, and the Drow and Deep Gnome have their proper challenge rating and traits.",
    "Wild Shape into a bat, cat, rat or other tiny beast now gives you its 1-damage attack.",
    "Character import lists misspelled spells it fixed, and keeps a file's Unearthed Arcana subclass even when the class name is misspelled.",
    "Cure Wounds, Shatter, Thunderwave and a few other spells now show their higher-level text on its own line, like every other spell.",
    "On phones, the Forge's full name fits in the header again."
  ] },
  { id: "2026-11-23-book-pages", date: "2026-11-23", title: "Rulebook parchment and a book typeface", go: "generate", items: [
    "Generated adventures, NPC cards and forged monsters now sit on yellowed, mottled parchment with steel-blue headings, like a D&D book at the table.",
    "Spells, items, the Monster Manual, character sheets and the Journal use the same classic book typeface."
  ] },
  { id: "2026-11-23-import-spelling", date: "2026-11-23", title: "Character import fixes spelling and finds subclasses", go: "roster", items: [
    "Importing a character now copes with spelling mistakes in class, subclass, species, background and feat names (\"Paladn\" becomes Paladin). The import summary shows what the file said.",
    "Subclasses like Oathbreaker now apply their features when imported, including with the 2024 rules, and a short name like \"Devotion\" finds Oath of Devotion.",
    "When the Forge has its own version of a class or subclass, it's used instead of a homebrew copy an earlier import made. Homebrew you wrote yourself still comes first."
  ] },
  { id: "2026-11-22-session-workflows", date: "2026-11-22", title: "Prepare your character and next session", go: "tracker", items: [
    "Character sheets show missing spell, subclass, and fighting style choices and flag differences from imported files.",
    "Queue campaign entries and Compendium references in Next Session, then put them in the order you plan to use them.",
    "Combat history records turn, initiative, condition, and hit point changes. Undo the last recorded change from the encounter."
  ] },
  { id: "2026-11-21-feats-and-parchment", date: "2026-11-21", title: "Feat spells and parchment previews", go: "roster", items: [
    "Feat benefits now appear under Abilities. Supported feat spells appear under Spells with their source and tracked free casts.",
    "Adventure and monster previews use classic handbook-style parchment, with weathered edges and blue ink headings."
  ] },
  { id: "2026-11-21-browse-compendium", date: "2026-11-21", title: "Browse the Compendium", go: "compendium", items: [
    "Open the Compendium to see entries right away. Use Edition, Type, or the page buttons to browse.",
    "Type part of a name or source to narrow the list. Clear the search to browse again."
  ] },
  { id: "2026-11-21-matching-search-fields", date: "2026-11-21", title: "Matching search fields", go: "compendium", items: [
    "Search boxes across the Forge use the same dark style, including popups and fields filled by the browser."
  ] },
  { id: "2026-11-21-granted-spell-sources", date: "2026-11-21", title: "See what grants your spells", go: "roster", items: [
    "The character sheet labels always-prepared spells and granted cantrips with their class, subclass, or species.",
    "Granted spells stay prepared and leave room for your own spell choices. An innate spell shows its free-use option when you open it.",
    "Removing untrained armor clears its spellcasting warning and disadvantage markers immediately."
  ] },
  { id: "2026-11-21-forge-focus", date: "2026-11-21", title: "Make room for character creation", go: "roster", items: [
    "Opening Forge a new character folds away Your characters and brings the creation form forward. Expand Your characters any time to switch back to a sheet."
  ] },
  { id: "2026-11-21-builder-next", date: "2026-11-21", title: "Keep building from the details panel", go: "roster", items: [
    "Search fields use the same style across the Forge. Tap Next in a race, lineage, class, or background panel to continue building your character.",
    "Preview a subclass during level-up and tap Next to use it."
  ] },
  { id: "2026-11-21-phone-session", date: "2026-11-21", title: "Play from your phone", go: "roster", items: [
    "Use the bottom navigation to reach the tools you use during a session. Open More for the complete menu.",
    "Adjust current HP and roll initiative or an attack from the top of your character sheet. Builder details open full screen on phones."
  ] },
  { id: "2026-11-21-tasha-xanathar-subclasses", date: "2026-11-21", title: "Build with Tasha’s and Xanathar’s subclasses", go: "roster", items: [
    "Use the 2014 builder to select Artificer or browse subclasses from both books. The level-by-level view now describes their features.",
    "Save choices such as an Armorer model, Rune Knight runes, and a Genie patron in Features & Traits."] },
  { id: "2026-11-20-2014-book-catalogs", date: "2026-11-20", title: "Search more 2014 sourcebooks", go: "compendium", items: [
    "Search by book or entry name to see source pages, spell parameters, monster statistics, and character options.",
    "Book references point to the full rules. Mind Sliver, Absorb Elements, and Zephyr Strike are also available in the 2014 spell catalog."] },
  { id: "2026-11-20-expansion-subclass-references", date: "2026-11-20", title: "More 2014 subclass references", go: "roster", items: [
    "Explore 20 more 2014 subclass options in the character builder and Compendium, including Drakewarden, College of Spirits, and Path of the Giant. The progression view shows feature names, levels, and where to read the rules."] },
  { id: "2026-11-20-campaign-sources-handouts", date: "2026-11-20", title: "Choose campaign sourcebooks and reveal handouts", go: "tracker", items: [
    "Use Sourcebooks in Campaign Tracker to set an edition and choose which books and homebrew your table uses.",
    "Save clues, portraits, and fog-safe map snapshots in Handouts. Reveal them when your players are ready to see them in the Journal."
  ] },
  { id: "2026-11-20-compendium-and-campaign-tools", date: "2026-11-20", title: "Search rules and reuse campaign prep", go: "compendium", items: [
    "Search character options, spells, items, and monsters in the Compendium. Filter by rules edition and open the details from your results.",
    "Save an encounter as a template to reuse its lineup, initiative setup, and linked map. Each new fight starts with full enemy HP.",
    "Campaign exports now include uploaded maps and NPC portraits available on this device."
  ] },
  { id: "2026-11-20-session-dashboard", date: "2026-11-20", title: "Open everything you need for tonight’s session", go: "tracker", items: [
    "Open Session in Campaign Tracker to resume a fight, read the latest recap, or pin a map, NPC, and lore entry for quick access.",
    "Renaming an inventory item that no longer requires attunement now updates the character sheet’s attunement count."] },
  { id: "2026-11-20-character-references", date: "2026-11-20", title: "Plan your next levels and inspect your gear", go: "roster", items: [
    "Choosing a class, species, or background opens its details right away. See level 1–20 progression, compare subclasses from books and homebrew, or review lineage choices and background benefits.",
    "Open Item details from your inventory to see weapon dice, attunement, and magic effects. Equipped magic item effects appear under Features & Traits."] },
  { id: "2026-11-20-bulk-import", date: "2026-11-20", title: "Bulk import for DMs", go: "homebrew", items: [
    "Homebrew → 📥 Bulk import from a file adds many spells, feats, species, backgrounds, subclasses, magic items or monsters at once, for example from books you own.",
    "Download a template for each kind, fill it in with Excel or Google Sheets, save it as CSV and choose it. Before anything is added you see what's new, what the Forge already has, and any problems.",
    "Spells, feats, species, backgrounds and subclasses become your homebrew, so your players can pick them. Magic items go to Items → Custom and monsters (paste the whole stat block) to My monsters."] },
  { id: "2026-11-20-book-options", date: "2026-11-20", title: "New species, subclasses, feats and backgrounds", go: "roster", items: [
    "Characters can now choose from 11 more species (with their subraces) from Kobold Press's Tome of Heroes: Alseid, Catfolk, Darakhul, Derro, Drow, Erina, Gearforged, Minotaur, Mushroomfolk, Satarre and Shade.",
    "97 more subclasses for the usual classes, from Tome of Heroes, the Tal'Dorei Campaign Setting and Open5e, like the Ancient Dragons patron, Circle of Bees and the Way of the Tipsy Monkey. Their features arrive at the right levels with their full text.",
    "14 more feats and 25 more backgrounds. Each shows the book it comes from.",
    "Random characters still use only the official rules, so characters you already have level up exactly as before."] },
  { id: "2026-11-20-extra-books", date: "2026-11-20", title: "About 3,700 more monsters, spells and magic items", go: "monsters", items: [
    "The Monster Manual has about 1,700 more monsters from Kobold Press's open-licensed books: Tome of Beasts 1, 2 and 3, Creature Codex and Black Flag.",
    "Spells has about 900 more, from Deep Magic, Tome of Heroes and other Kobold Press books, plus Spells That Don't Suck. Characters can prepare them like any other spell.",
    "Items has about 1,000 more magic items from Vault of Magic.",
    "Each one shows its book's name, and a new Book filter in each list can show just one book, or just the official rules.",
    "They also turn up in random encounters, shops, treasure hoards and Wild Shape. Each place now has many more creatures to roll."] },
  { id: "2026-11-19-requests", date: "2026-11-19", title: "Ask for a feature", go: "requests", items: [
    "There's a new Requests tab. Signed-in players and DMs can ask for something new, a change, or a fix.",
    "Tell us what you're trying to do and how you'd like it to work. A screenshot (marked up if you can) makes it much more likely to be approved.",
    "Your requests show their status (New, Planned, Being built, Done) and any reply from us."] },
  { id: "2026-11-19-third-casters", date: "2026-11-19", title: "Eldritch Knights and Arcane Tricksters cast spells", go: "roster", items: [
    "Fighters who choose the Eldritch Knight and Rogues who choose the Arcane Trickster now get spellcasting from level 3: spell slots, a spell save DC and attack with Intelligence, and wizard spells to pick.",
    "Their slots grow as they level (2 first-level slots at level 3, up to level 4 spells at 19), and they count a third of their level toward spell slots when multiclassing.",
    "Existing characters get it automatically next time their sheet opens or they level up."] },
  { id: "2026-11-19-treasure-hoard", date: "2026-11-19", title: "Treasure hoards", go: "items", items: [
    "Items → 🎲 Treasure hoard rolls a monster's lair treasure: coins, gems, art objects and magic items, bigger and rarer for tougher challenges (0–4, 5–10, 11–16, 17+).",
    "Roll again until you like it, then + Add to campaign Loot. The coins, each gem or art piece and each magic item go on the campaign's Loot list, ready to give to characters.",
    "In the Campaign Tracker, the Loot tab has 💰 Roll a hoard too, matched to the campaign's level.",
    "A hoard can belong to an encounter: pick it under Encounter, or press 💰 Hoard on the encounter itself. The hoard matches the toughest monster in that fight, its Loot entries say which encounter they came from, and the encounter shows its treasure."] },
  { id: "2026-11-19-one-characters-tab", date: "2026-11-19", title: "Characters and My Characters are now one tab", go: "roster", items: [
    "The Characters tab now holds everything: your characters on the left, ⚒ Forge a new character underneath, and one full sheet.",
    "A newly forged character opens on the same sheet as your saved ones, so you can roll, change scores, pick spells and gear straight away. A bar on top says it isn't saved yet: ☆ Save character keeps it, ↻ Reroll forges again, ✕ Discard throws it away.",
    "Unsaved characters stay in this browser. Only saved characters are shared with your campaign."] },
  { id: "2026-11-18-start-folded", date: "2026-11-18", title: "Long lists start folded", items: [
    "Items, Spells and the Monster Manual now open with their groups folded, so you see a short list of group names instead of hundreds of rows. Press ▾ on a group to open it.",
    "Anything you open or fold is remembered on this device. Typing in a list's search box opens the groups so you can see what matches.",
    "Character sheets still open fully. Their first section's title bar now has Fold all (and then Unfold all), so you can fold the whole sheet down to its section names in one press.",
    "On phones, section titles on character sheets show in full again instead of being cut short."] },
  { id: "2026-11-18-fold-lore-links", date: "2026-11-18", title: "Fold long lists, and Lore fills your tabs", items: [
    "Long lists fold away: press ▾ at the right of a group's title bar (or click the bar) on Items, Spells, the Monster Manual and character sheets. Lists with several groups also have Fold all and Unfold all. Your choice is remembered on this device.",
    "Campaign Tracker → Lore: saving an entry as an Item adds it to Items → Your custom items, a Monster adds it to My monsters (with its numbers if the text has a stat block), and an Encounter adds it to the campaign's Encounters tab with the monsters its text names. Places already went to the World tab.",
    "Editing the Lore entry again updates the same item, monster or encounter. An item you've changed in the Items builder is left alone, and nothing is added if something with that name is already there.",
    "Sections marked DM only stay out of an item's text, so it's safe to hand to a player."] },
  { id: "2026-11-18-realistic-backdrop", date: "2026-11-18", title: "A real dungeon behind the Forge", items: [
    "The background is now a photo-real stone corridor, and its two torches burn live. Phones held upright get their own tall version.",
    "If your device is set to reduce motion, the picture stays still."] },
  { id: "2026-11-18-spell-bubbles", date: "2026-11-18", title: "Tap a spell to read it and cast it", go: "roster", items: [
    "Prepared spells on a character sheet are now bubbles. Tap one to see the whole spell: casting time, range, components, duration, what it does and what it does at higher levels.",
    "On My Characters, choose the level to cast at: each button shows how many slots you have left, and the line underneath shows the damage or healing at that level, so casting higher is easy. ✦ Cast uses up the slot and rolls.",
    "Each spell level shows how many slots you have left, and spells that need concentration or can be rituals are marked C and R.",
    "Everything about spells is now in one Spells box on the sheet: your spell save DC, the spell slot counters, and your prepared spells. The Attacks box keeps just your attacks.",
    "Fixed: a character who multiclasses into a spellcaster (say a Fighter who takes Wizard levels) can now prepare that class's spells. Each class offers spells up to its own level."] },
  { id: "2026-11-18-fecs-import", date: "2026-11-18", title: "Import from the Fifth Edition Character Sheet app", go: "roster", items: [
    "📥 Import character on My Characters now also reads characters from the Fifth Edition Character Sheet app. In the app, export the character (or upload it to Google Drive) and choose its .xml file.",
    "Name, species, classes and levels (multiclass too), subclass, scores, saves, skills, prepared spells, fighting style, coins, XP, equipment, languages and notes all come across. Counts like “holy water x5” are kept.",
    "Misspelled spells are matched to the real spell. Anything in the spell list that isn't a spell the Forge knows goes into the character's notes, and the summary lists it. A “Custom” background stays as a name, without background features."] },
  { id: "2026-11-18-polish", date: "2026-11-18", title: "Tidier Adventure, Characters and Items tabs", items: [
    "On phones, pressing Forge now takes you straight to your new adventure or character, instead of leaving it below the form.",
    "On laptops, the Forge button stays in view at the bottom of the left-hand panel, and the header shrinks to a slim bar as you scroll down (it comes back at the top).",
    "The character sheet has one main button, ☆ Save to My characters, with the other actions beside it and Discard at the end. “Copy sheet as text” moved onto the sheet.",
    "On phones, the Items filters fold behind a Filters button, so the item list starts near the top. Buttons on phones are a little bigger for fingers.",
    "Smaller touches: an easier-to-read heading on the Adventure tab, sheet sections that use the full width, level tags that don't break across lines, and new icons on the main buttons."] },
  { id: "2026-11-18-region-builder", date: "2026-11-18", title: "Make regions with their maps", go: "world", items: [
    "On the World tab, press 🛠 World builder and choose 🗺️ Region. Give it your own name (or leave it empty for a made-up one), pick Coast, Inland or Island and the kind of land, and see the map as you go. Press 🎲 Roll again until you like it.",
    "Rename the mountains, forests, rivers, seas and lakes in the boxes under the map before you save it.",
    "Press ✓ Add to World to keep it as a region in the campaign you chose. The builder is then ready for the next one, so making Region One and then an island for Region Two takes a minute. Your regions show up on the 🌍 World map."] },
  { id: "2026-11-17-side-jump", date: "2026-11-17", title: "No more jumping side panel", items: [
    "On some screen sizes, hovering a box in the left-hand panel (like the party level boxes on the Generate tab) made its buttons jump between one row and two. The panel now keeps room for its scroll bar, so it stays still."] },
  { id: "2026-11-17-shops", date: "2026-11-17", title: "Better shops", go: "world", items: [
    "“🏪 Generate a shop” on the Items tab now opens the World builder on Shop, so every shop you make belongs to a place in your World.",
    "Choose the shop's name, kind, where it is (the settlement size fills itself in), the party level, which magic item rarities it sells, how much stock it carries and the shopkeeper's manner. Tick a rarity and the shop will have some magic items of it.",
    "Open a saved shop with “🛒 Open the shop”. Set a markup, such as +20% or −10%, and every price changes. Type in your own price for any item; it stays put when the markup changes.",
    "What's sold stays sold, even after you close the page. Press “🔄 Restock” to fill the shelves again with new stock."] },
  { id: "2026-11-17-safety", date: "2026-11-17", title: "A safety fix for shared campaigns", items: [
    "The Journal and the turn order on players' phones now only ever carry plain names, numbers and text, checked by the server. Nothing in them can run as code in a player's browser."] },
  { id: "2026-11-17-world-maps", date: "2026-11-17", title: "World and region maps", go: "world", items: [
    "On the World tab, open a region and press “🗺️ Make a map”: the Forge paints its land, coast, rivers, forests and mountains, and names the biggest of them. Pick Coast, Inland or Island and how mountainous it is, and press 🎲 Roll again until you like it.",
    "Every town, village, dungeon, landmark and wild place inside the region gets a pin in a sensible spot: cities by water, dungeons in the hills. Drag a pin to move it. Places you add later are pinned too.",
    "Have your own map from Inkarnate, Wonderdraft or a book? Press “⬆ Import a map” to use your picture instead, with the same pins.",
    "Press “📺 Show on TV” to show the map to the players. Places they haven't found yet don't appear on the TV. Click a pin and choose “Reveal to the players” when they find it. Click the map while it's on the TV to ping a spot.",
    "“🌍 World map” at the top of the World tab shows your regions on one map; click a region's name to open its map.",
    "Map pictures you import stay on the computer you imported them on (they're in your 💾 Backup). Generated maps, pins and what the players have found go everywhere you sign in."] },
  { id: "2026-11-17-players-journal", date: "2026-11-17", title: "A Journal for players, turn order on phones, and homebrew classes", go: "journal", items: [
    "Players have a new Journal tab: the quests, session recaps and lore the DM shares, plus the day and weather. DMs: quests and sessions show unless you set “Players see it” to No; tick “Players see this” on a Lore entry to share it. Quest notes and DM-only sections stay with you. Your Journal tab shows what players see.",
    "DMs: press “📱 Show players” on an encounter and your players see the turn order on their phones, with a “Your turn!” when it's theirs. Monsters show as Bloodied or Down, never their hit points.",
    "Players: tick “Share my rolls with the DM” in the 🎲 Rolls box and your rolls show up in the DM's activity feed.",
    "Homebrew classes: in the Homebrew tab, DMs can now make a whole class (Blood Hunter, Gunslinger…) with its hit die, skills, armour, spellcasting and features by level. Characters can take it, level up in it and multiclass into it.",
    "Importing a character whose class the Forge doesn't have no longer fails: the class comes in as homebrew, with its features, for the DM to approve.",
    "Imported characters keep their gender when the file or the backstory says it.",
    "The 💾 Backup file now includes your map and NPC pictures.",
    "The torchlit background uses less battery on phones."] },
  { id: "2026-11-17-account-saves", date: "2026-11-17", title: "Your Campaign Tracker on every device", go: "tracker", items: [
    "DMs: when you're signed in, your Campaign Tracker, World places, NPCs, custom items and homebrew monsters are now saved to your account, not just this browser. Sign in on your laptop, tablet or phone and they're all there.",
    "It's private to you. Players never see it.",
    "Lost signal at the table? Keep going. Changes are kept on your device and upload as soon as you're back online. The badge at the top says “✓ Saved to your account” when everything is up.",
    "The first time you sign in on a browser that already has work in it, the Forge asks whether to add it to your account. Whatever you choose, it stays in that browser for when you're signed out.",
    "Changed the same campaign on two devices? Nothing is lost: you're asked which version to keep, or both are kept.",
    "Fixed: if a player and the DM saved the same character sheet at the very same moment, one of the changes could be lost without warning. Now the second one is asked which version to keep, as it already was a moment later."] },
  { id: "2026-11-17-faster", date: "2026-11-17", title: "Opens faster", items: [
    "The Forge now keeps its spells, monsters, items and its own code on your device after the first visit, so it opens much faster, especially on phones at the table. Each visit after that only fetches the small part that might have changed.",
    "When the Forge is updated, your device still picks up the new version straight away.",
    "Nothing else changes: your characters, campaigns and settings are where they were."] },
  { id: "2026-11-17-setup", date: "2026-11-17", title: "Start a campaign your way", items: [
    "When you set up as DM, the campaign name and your name are optional. Leave them empty and it's called “New Campaign”, run by “DM”.",
    "DMs can rename their campaign any time: click the account button at the top and use Rename the campaign.",
    "New here? “Not now” on the setup screen lets you look around the DM tools first, still signed in. Start or join a campaign later from the account button."] },
  { id: "2026-11-17-world-builder", date: "2026-11-17", title: "World builder, and places grouped by type", go: "world", items: [
    "The World tab now groups your places by type: Cities, Towns, Taverns & inns, Shops, Temples, Dungeons and so on. Click a group to open it. Pick a campaign at the top to see only its places, or switch to Map to see what's inside what.",
    "New 🛠 World builder: make a whole settlement (village, town or city), an inn, a shop, a temple or a dungeon in one go. Pick a few options, press 🎲 Roll again until you like it, then ✓ Add to World.",
    "A city comes with districts, inns, shops and a temple inside it, plus its ruler, the captain of the watch and the people who run each place. Inns have rooms, a menu with prices and rumours; temples have services; dungeons come with a map.",
    "Shops are real shops: press 🛒 Open the shop on a shop's page to see its stock on the Items tab, where characters can buy from it.",
    "Choose a campaign in the builder and the new place goes into its Lore, with its NPCs in its NPC list."] },
  { id: "2026-11-17-world-maps", date: "2026-11-17", title: "A map for every World place", go: "world", items: [
    "Each place on the World tab has a Map section. Upload a map picture (a city, a region or a battle map), generate a dungeon map for it, or use the map that's open on the Dungeon Map tab.",
    "The map shows on the place's page. Click it, or press Open on Dungeon Map, to add room notes, show it on the TV and reveal it with fog as the players explore.",
    "The Dungeon Map tab has a new Save to a World place box, so your changes (fog, room notes, tokens, a new layout) are kept with the place."] },
  { id: "2026-11-17-world-nest", date: "2026-11-17", title: "MythWeaver places nest by themselves", go: "world", items: [
    "Places imported from MythWeaver are now put inside each other on the World tab, worked out from their text: a tag naming another place, a Location section, or wording like “an inn in Riverford” or “a district of Riverford”.",
    "A place only goes inside a bigger one (a tavern in a town, a town in a region), and “near” or “outside” doesn't count. Places you've already imported are sorted the next time you open the Forge.",
    "Anything you move yourself stays where you put it, even if you import again."] },
  { id: "2026-11-17-world", date: "2026-11-17", title: "Build your world: places, and the NPCs who live there", go: "world", items: [
    "A new World tab holds your regions, cities, towns, districts, taverns, shops, temples and dungeons. Put places inside each other (a tavern in a district in a city) and open or close them in the tree.",
    "A place's page shows the places inside it and every NPC who lives there, including those in the places inside it. Add a new NPC there, or move one in.",
    "Tick a campaign on a place to put it in that campaign's Lore. Edit it in either spot and both change. The places already in your campaigns' Lore (from MythWeaver too) are added to the World for you.",
    "NPCs are filed under World places. The NPC tab and the Campaign Tracker's NPCs tab both have a tab per place (a city's tab includes the places inside it) and a place picker on each NPC.",
    "Renaming a place renames it everywhere. Exported campaign files carry their places, so importing one on another computer brings them along."] },
  { id: "2026-11-17-npc-places", date: "2026-11-17", title: "NPCs sorted by place, and imported encounters", go: "npc", items: [
    "Your NPCs on the NPC tab now has a tab for each place. Use 📍 Move to… on an NPC to file it under a town, district or dungeon: pick one of your places, a Place from your campaigns' Lore, or ＋ New place….",
    "Click a place's tab to see only the NPCs there, or No place for the ones not filed yet. + New NPC adds to the place you're looking at. The Campaign Tracker's NPCs tab has a Place box too.",
    "MythWeaver NPCs tagged with one of the campaign's places are filed there when you import.",
    "MythWeaver encounters now also go to the campaign's Encounters tab, ready to run. Monsters the text names (like “three goblins and a bugbear”) are added with their AC and HP; check them, since they're read from the text."] },
  { id: "2026-11-17-npc-list", date: "2026-11-17", title: "All your NPCs in one place, and imported monsters", go: "npc", items: [
    "The NPC tab now has Your NPCs: every NPC from all your campaigns, with a tick box for each campaign. Tick one to put that NPC in it; an NPC can be in several campaigns at once.",
    "Change an NPC's name, role, attitude, notes or picture there or in the Campaign Tracker, and it changes in every campaign it's in. Untick every campaign and the NPC stays in the list, ready for later.",
    "Importing a campaign puts its NPCs in Your NPCs, ticked for that campaign.",
    "MythWeaver monsters now go to Monster Manual → My monsters. If MythWeaver has the stat block (AC, hit points and scores), the numbers, traits and actions come across; if not, the monster is marked “needs stats” for you to finish in Build a monster."] },
  { id: "2026-11-17-camp-extras", date: "2026-11-17", title: "Imported campaigns bring their items and spells", go: "items", items: [
    "⬆ Import campaign now adds custom items to Items → Custom, ready to Give or Buy for a character, and custom spells to Homebrew.",
    "From MythWeaver: items become custom items (with rarity and attunement when the text says so) and spells become homebrew spells. They stay in Lore too, and DM-only notes aren't copied onto them. Untick “Items and spells” in the import window to skip this.",
    "Forge campaign files: Export JSON now packs in your custom items, homebrew (including spells) and custom monsters, and importing the file adds them back.",
    "Anything you already have isn't added twice. Loot rows that name a custom item now hand over its weight and attunement with “Give to…”."] },
  { id: "2026-11-17-mythweaver", date: "2026-11-17", title: "Import your MythWeaver campaign, and a Lore tab", go: "tracker", items: [
    "In the Campaign Tracker, ⬆ Import campaign now reads MythWeaver exports as well as Forge campaign files. Pick which campaigns and characters to bring in.",
    "Sessions and their recaps go to Sessions, NPCs (with their pictures) to NPCs, and everything else (places, items, monsters, encounters and notes) to a new Lore tab.",
    "Each campaign has a Lore tab: search it, filter by type, open entries to read them, add and edit your own, and show a picture on the TV. DM-only parts are marked.",
    "Importing the same MythWeaver campaign again updates it, keeping anything you added in the Forge. Characters go to My Characters."] },
  { id: "2026-11-17-layout", date: "2026-11-17", title: "Easier on phones", go: "roster", items: [
    "Pop-up windows always fit your screen, with their buttons (Import, Level up, Cancel and so on) pinned at the bottom where you can see them.",
    "On phones the header shrinks to one slim line and gets out of the way while you scroll or type, then comes back when you scroll up.",
    "My Characters has a jump bar on phones: tap HP, Attacks, Spells, Gear or Notes to go straight there mid-fight.",
    "Bigger buttons on touch screens, and nothing sits on top of the last thing on a page any more.",
    "Spells shows the list first on phones, with the filters behind a Filters button."] },
  { id: "2026-11-16-charimport", date: "2026-11-16", title: "Import characters from the 5e Companion App or a PDF", go: "roster", items: [
    "My Characters has a new ⬆ Import character button. Choose a character file exported from the 5e Companion App, or a fillable PDF character sheet, and the Forge rebuilds it as a Forge character, with the same ability scores, skills, gear, coins, spells and story.",
    "PDF sheets need to be ones you can still type into (the official fillable 5e sheet). Hand-typed spell names are matched even with small spelling mistakes, and spells the Forge doesn't know are added as homebrew at the right level.",
    "Before anything is saved you see what matched, what becomes homebrew, and anything that couldn't come across (those go into the character's notes).",
    "Subclasses, species, backgrounds, feats and spells the Forge doesn't have are added to Homebrew automatically, with their rules text from the file. Homebrew can now have spells too.",
    "When a player imports while signed in, any new homebrew waits for the DM: it shows under Waiting for approval on the Homebrew tab, and only that player's character uses it until the DM approves."] },
  { id: "2026-11-16-npcpics", date: "2026-11-16", title: "Pictures for your NPCs", go: "tracker", items: [
    "Every NPC in the Campaign Tracker now has a picture frame. Add a picture from your computer, or paste a picture link that starts with https://.",
    "Press 📺 TV to show the picture on the players' screen. Only the picture goes to the TV, never the NPC's name or notes, and it keeps its shape with no stretching.",
    "Pictures you add are kept on this computer, like imported maps, so they aren't in Backup files. Picture links work on any device."] },
  { id: "2026-11-15-signin-fix", date: "2026-11-15", title: "Sign-in screen fixed", items: [
    "If your saved sign-in had expired, the Forge showed \"Please sign in\" with no way to sign in. It now shows the email and password form again, with \"Use without an account\" below it.",
    "If the campaign server can't be reached, you can now try again, sign in with another account, or use the Forge without an account."] },
  { id: "2026-11-15-tokens", date: "2026-11-15", title: "Tokens on the TV map", go: "map", items: [
    "While hosting the player screen, add tokens for the party, for the fight on the TV, or by name, then drag them with the Tokens tool.",
    "Tokens in the fog stay hidden from players, and monsters show Bloodied (orange ring) or Down (grey with a cross) to match the fight.",
    "Tokens are kept with the map's fog and saved with the campaign."] },
  { id: "2026-11-15-rulesfix", date: "2026-11-15", title: "Character sheet rules fixes", go: "roster", items: [
    "Sorcerers were getting 1 extra hit point per level (Draconic sorcerers got their bonus twice). Their HP is corrected the next time the sheet is levelled or rebuilt.",
    "2024 paladins and rangers now have their two spell slots at level 1.",
    "2014 bards add Jack of All Trades to initiative, and 2014 Champion fighters' Remarkable Athlete now rounds up as the rules say.",
    "The sheet maths is now checked automatically against the rules for every class and level."] },
  { id: "2026-11-15-recap", date: "2026-11-15", title: "Session recaps", go: "tracker", items: [
    "On a campaign's Sessions tab, press Write a recap. It gathers the fights you finished, XP, quests done or failed, chapters, loot handed out and the calendar's log since last time.",
    "It's saved as a new session that you can edit, ready to share with your players."] },
  { id: "2026-11-15-calendar", date: "2026-11-15", title: "Calendar and weather", go: "tracker", items: [
    "Each campaign has a Calendar tab: the day, season, time of day and today's weather.",
    "Buttons for short and long rests, the next morning and travelling several days, with new weather each day.",
    "Weather that matters in play says what it does, like strong wind or extreme cold. Rests, travel and your notes are logged."] },
  { id: "2026-11-15-runfight", date: "2026-11-15", title: "Run a map room's fight", go: "map", items: [
    "Rooms with a fight in the map's Room Key have ⚔ Run this fight: it adds the fight to your campaign's encounters.",
    "While the TV is on, it also reveals that room and puts the turn order on the TV."] },
  { id: "2026-11-15-spellcards", date: "2026-11-15", title: "Printable spell cards", go: "roster", items: [
    "On My Characters, press 🃏 Spell cards for a printable card for each prepared spell: casting time, range, components, duration and the full text.",
    "Print them or save them as a PDF. Item cards now print with their full text again too."] },
  { id: "2026-11-15-random", date: "2026-11-15", title: "Random encounters", go: "tracker", items: [
    "In Campaign Tracker → Encounters, pick a place (forest, swamp, city streets, the Underdark and more) and a difficulty, then press Roll.",
    "You get monsters that live there, sized for your party's level, with their real AC and HP and a note on what they're up to.",
    "The fight is added to your encounters, ready for initiative and the TV."] },
  { id: "2026-11-15-shops", date: "2026-11-15", title: "Shops for your towns", go: "items", items: [
    "On the Items tab, press 🏪 Generate a shop: a general store, blacksmith, bowyer, alchemist, magic shop or temple, sized for a village, town or city.",
    "Each shop has a name, a shopkeeper with a manner that changes the prices, and stock suited to the party's level.",
    "Buy takes the coins from a character and puts the item in their inventory."] },
  { id: "2026-11-15-mapimport", date: "2026-11-15", title: "Import your own maps, export to Foundry and Roll20", go: "map", items: [
    "Import a map picture (from Dungeondraft, Dungeon Scrawl, a book or a scan), line up the grid, and click to number its rooms. Each room gets notes, or 🎲 Roll contents for an encounter, trap or treasure.",
    "Dungeondraft's Universal VTT files (.dd2vtt) import with their grid and walls, so revealing a room on the TV stops at its walls.",
    "Export → Map file saves everything about a map to share or move to another computer. Foundry / VTT and Roll20 picture export your dungeons for online play.",
    "Imported maps work with the TV screen and fog, and save to campaigns too."] },
  { id: "2026-11-15-mapstyles", date: "2026-11-15", title: "Better-looking dungeon maps", go: "map", items: [
    "Every theme has its own floor: crypt flagstones, wooden keeps, temple tiles and mosaics, sewer channels, mine cart tracks and rocky caves.",
    "Caves now have natural, curving walls, and rooms are furnished to match the room key: sarcophagi, altars, bookshelves, barrels, pools and more.",
    "Pick a style: Parchment, Classic blue graph paper, or Dark for TVs and screens.",
    "Hover a room to find it in the key, click it to jump there, and zoom in with + and −.",
    "Download player map gives you a copy without traps, secret doors or spoilers to hand out."] },
  { id: "2026-11-15-tvextras", date: "2026-11-15", title: "Turn order and handouts on the TV", go: "map", items: [
    "In an encounter, press 📺 Show on TV: the TV shows whose turn it is and the round. Monsters show as Bloodied or Down, never their HP.",
    "Show a picture from your computer on the TV, or type a letter, note or riddle and it appears on parchment. Back to map returns to the dungeon."] },
  { id: "2026-11-15-backup", date: "2026-11-15", title: "Back up your characters and campaigns", items: [
    "Using the Forge without an account? Press 💾 Backup at the top to download a backup file of your characters, campaigns, homebrew, items, monsters, favourite spells and map fog.",
    "Restore from backup puts it all back, in this browser or on another computer.",
    "Download buttons (map pictures, campaign exports) now work on the website too."] },
  { id: "2026-11-15-tvmap", date: "2026-11-15", title: "Show the dungeon map on a TV", go: "map", items: [
    "On Dungeon Map, press 📺 Host for players to open a second window for a TV or second monitor.",
    "Players only see what you reveal: click a room, paint with the brush, or drag a box. Undo, Reveal all and Hide all are there too.",
    "Traps never show on the TV, and secret doors look like wall until you mark them found.",
    "Shift+click flashes a ring on the TV to point something out. Nothing is sent over the internet."] },
  { id: "2026-11-15-table", date: "2026-11-15", title: "Play at the table", go: "roster", items: [
    "Click any ability, save, skill, initiative, attack or damage on your sheet to roll it. The 🎲 box keeps your recent rolls and switches between Normal, Advantage and Disadvantage.",
    "Conditions and exhaustion live on the sheet and change your rolls and speed for you.",
    "Concentration is tracked, and taking damage tells you the save you need.",
    "Dropping to 0 HP knocks you out and shows the death save boxes.",
    "Cast spells straight from the sheet with ✦: pick a slot and it rolls the damage, healing or saves for you."] },
  { id: "2026-11-15-multiclass", date: "2026-11-15", title: "Multiclassing and feature choices", go: "roster", items: [
    "“＋ Another class” adds a level in a second class, checking the ability score requirements.",
    "Hit points, spell slots and class resources follow the multiclassing rules.",
    "Pick your Battle Master maneuvers, Warlock invocations, Metamagic, Magic Initiate spells and other choices right on the sheet."] },
  { id: "2026-11-15-dm", date: "2026-11-15", title: "For the DM: party view and XP", go: "tracker", items: [
    "The Encounters tab now opens with the whole party: AC, hit points, passive Perception, conditions and concentration, with damage and heal buttons.",
    "“🏆 Award XP” splits an encounter's XP between the party. Sheets show when a character has enough XP to level up.",
    "Hand campaign loot straight to a character's inventory with “Give to…”."] },
  { id: "2026-11-15-gear", date: "2026-11-15", title: "Gear, gold and proficiencies", go: "items", items: [
    "2024 backgrounds can take 50 gp instead of their equipment.",
    "Buy items from the Items tab: the price comes out of the character's coins, with change.",
    "Carrying too much slows you down, and the sheet shows how much you carry.",
    "A new Proficiencies & Languages section lists armor, weapons, tools and languages."] },
  { id: "2026-11-15-character", date: "2026-11-15", title: "Male or female characters", go: "character", items: [
    "Choose Random, Male or Female when you create a character, and the name matches. You can change it later on the sheet."] },
  { id: "2026-11-15-app", date: "2026-11-15", title: "Phones and installing as an app", items: [
    "On a phone the tabs fit in one row you can swipe, so the page starts with what you came for.",
    "Install the Forge as an app with “⬇ Install app” (in browsers that offer it). Once loaded, it opens even without a connection.",
    "Monster fixes: the Donkey, Drow and Deep Gnome can walk again, and two monsters have corrected hit points."] },
  { id: "2026-11-14-sheet", date: "2026-11-14", title: "A fuller character sheet", go: "roster", items: [
    "Your starting gear is now an inventory with Equip boxes. Armor sets your AC, and weapons set your attacks.",
    "Click any class or subclass feature to read its full rules.",
    "An Abilities section with counters for ki, sorcery points, spell slots and more, plus Activate buttons for things like Rage and Wild Shape.",
    "Short and long rest buttons.",
    "Hide the toolbar with “▴ Hide tabs” for more room."] },
  { id: "2026-11-14-backgrounds", date: "2026-11-14", title: "Backgrounds by rule set", go: "character", items: [
    "2014 and 2024 each have their own backgrounds, with a short description and everything they give.",
    "2024 backgrounds add their Origin feat to the character automatically."] }
];
const NEWS_KEY = "dmforge.newsSeen";
const newsSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(NEWS_KEY) || "[]")); } catch { return new Set(); } };
function newsBadge() {
  const seen = newsSeen(), n = NEWS.filter(x => !seen.has(x.id)).length, btn = document.getElementById("newsBtn"), b = document.getElementById("newsN");
  b.hidden = !n; b.textContent = n > 9 ? "9+" : n; btn.classList.toggle("has-new", !!n);
  document.getElementById("newsSr").textContent = n ? `What's new: ${n} new update${n === 1 ? "" : "s"}` : "What's new";
}
function newsOpen(open) {
  const P = document.getElementById("newsPanel"), btn = document.getElementById("newsBtn");
  if (!open) { P.hidden = true; btn.setAttribute("aria-expanded", "false"); return; }
  const seen = newsSeen(), e = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  const day = d => new Date(d + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  document.getElementById("newsList").innerHTML = NEWS.map(x => `<div class="news-item ${seen.has(x.id) ? "" : "unread"}"><h4>${e(x.title)} <span class="news-date">${day(x.date)}</span>${seen.has(x.id) ? "" : `<span class="news-new">New</span>`}</h4><ul>${x.items.map(i => `<li>${e(i)}</li>`).join("")}</ul>${x.go && !document.querySelector(`nav a[data-view="${x.go}"]`)?.hidden ? `<button class="btn sm" type="button" data-newsgo="${x.go}">Show me →</button>` : ""}</div>`).join("");
  document.documentElement.classList.remove("hdr-away");
  // under the bell; if the phone header is sliding back in, measure from where it ends up, not where it is right now
  const head = document.querySelector("header"), r = btn.getBoundingClientRect(), shift = head.getBoundingClientRect().top;
  P.style.top = Math.max(8, Math.round(r.bottom - Math.min(0, shift) + 8)) + "px";
  P.hidden = false; btn.setAttribute("aria-expanded", "true");
  P.style.maxHeight = Math.max(200, Math.min(640, innerHeight - P.getBoundingClientRect().top - 12)) + "px"; /* fit below where it opens */
  localStorage.setItem(NEWS_KEY, JSON.stringify(NEWS.map(x => x.id))); newsBadge();
  document.getElementById("newsClose").focus();
}
document.getElementById("newsBtn").addEventListener("click", e => { e.stopPropagation(); newsOpen(document.getElementById("newsPanel").hidden); });
document.getElementById("newsClose").addEventListener("click", () => { newsOpen(false); document.getElementById("newsBtn").focus(); });
document.getElementById("newsPanel").addEventListener("click", e => { const g = e.target.closest("[data-newsgo]"); if (g) { newsOpen(false); location.hash = g.dataset.newsgo; } });
document.addEventListener("click", e => { const P = document.getElementById("newsPanel"); if (!P.hidden && !P.contains(e.target)) newsOpen(false); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !document.getElementById("newsPanel").hidden) { newsOpen(false); document.getElementById("newsBtn").focus(); } });
newsBadge();

/* ---- install as an app (PWA) ---- */
if ("serviceWorker" in navigator && location.protocol !== "file:") window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
let installEv = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEv = e; const b = document.getElementById("installBtn"); if (b) b.hidden = false; });
window.addEventListener("appinstalled", () => { installEv = null; const b = document.getElementById("installBtn"); if (b) b.hidden = true; toast("The Forge is installed. Open it from your home screen or apps list."); });
document.getElementById("installBtn").addEventListener("click", async () => {
  if (!installEv) return; installEv.prompt(); const r = await installEv.userChoice.catch(() => null); installEv = null;
  if (!r || r.outcome !== "accepted") document.getElementById("installBtn").hidden = true;
});
