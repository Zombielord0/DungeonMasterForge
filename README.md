# Dungeon Master's Forge

Live at https://dungeonmasterforge.netlify.app

## Layout

- `public/index.html`: the Forge itself (one page). **Upload new versions of the HTML here**, replacing this file.
- `src/portal.js`: player and DM portals (sign-in, shared characters, Party tab, whispers). Built into `public/portal.js`.
- `netlify/functions/api.mjs` + `netlify/lib/`: the campaign API at `/api/*`.
- `netlify/database/migrations/`: database tables, applied automatically on deploy.

## How the portals work

- The DM signs in, creates a campaign and shares its join code.
- Players create an account, enter the code once, and see: Characters, My Characters, Spells, Items, Whispers.
- The DM sees every tool plus **Party**: every player's sheet (click to view or edit), an activity feed of changes, and whispers to one player.
- The DM's **Homebrew** tab adds custom subclasses, backgrounds, feats and species. Everyone in the campaign sees them in the character creator, Level up window and feat list; only the DM can change them.
- If the DM and a player save the same sheet at once, whoever saves second is asked which version to keep.
- "Use without an account" keeps the old behaviour: DM tools, saved in this browser only.

## Dungeon maps

- Pick a **Theme** and a **Style**: Parchment, Classic blue graph paper, or Dark for TVs and screens.
- Hover a room to find it in the Room Key, and click it to jump there. **+** and **−** zoom in and out, and you can drag to move around.
- **Import a map:**
  - **Picture…** loads a map picture from Dungeondraft, Dungeon Scrawl, Inkarnate, a book or a scan. Set **Squares across** (and nudge the grid) until the grid lines up. Then tick **Place rooms** and click the map to number each room, and write notes or press **🎲 Roll contents**.
  - **VTT file…** loads Dungeondraft's `.dd2vtt` files with their grid and walls.
  - **Map file…** loads a map saved with Export.
- **Export:**
  - **Map file** saves everything about a map, including imported pictures, to share or move to another computer.
  - **Foundry / VTT** saves a `.dd2vtt` file. Foundry opens it with the free "Universal Battlemap Importer" module.
  - **Roll20 picture** saves a picture at 70 px per square.
- **Download player map** saves a copy without traps, secret doors or the boss marker, to hand to players.

## Showing the dungeon map on a TV

1. Open **Dungeon Map** and generate (or open a saved) map.
2. Under the map, press **📺 Host for players**. A second window opens. Drag it onto the TV or second monitor and double-click it for full screen.
3. Players see only what you reveal. With the fog tools you can:
   - **Room:** click a room or corridor.
   - **Brush:** paint squares.
   - **Box:** drag a rectangle.
   - **Secret door:** click an "S" once the players find it.
   - Use the **Reveal on TV** buttons in the Room Key, which also work with the keyboard. A secret door turns green on your map once the players have found it.
   - Switch **Mode** to **Hide** to cover areas again, and use **Undo** if you make a mistake.
4. **Turn order:** in Campaign Tracker → Encounters, press **📺 Show on TV** on a fight. The TV shows whose turn it is and the round. Monsters show only as Bloodied or Down.
5. **Handouts:** under the fog tools, show a picture from your computer, or type a letter or note to show on parchment. **Back to map** returns to the dungeon.
6. **Tokens:** press **+ Party**, **+ Fight on TV**, or type a name and press **Add**. Then choose the **Tokens** tool and drag them. Tokens in the fog stay hidden from players.
7. **Shift+click** the map to flash a ring on the TV.
8. Traps never show on the TV.

Everything stays on your computer, and no internet traffic or Netlify usage happens during play. Fog is remembered on this computer. Press **Save** to keep it with a campaign.

## Shops

On the **Items** tab, press **🏪 Generate a shop**. Choose the kind of shop, the settlement (village, town or city) and the party's level, and press **🎲 Roll again** until you like it. **Buy** takes the coins from the character chosen in "Give items to" and adds the item to their inventory.

## Random encounters

In **Campaign Tracker → Encounters**, pick where the party is and how hard the fight should be, then press **Roll**. You get monsters that live there, sized for your party's level, with a note on what they're doing. The fight is added to your encounters.

## Calendar and weather

Each campaign in the **Campaign Tracker** has a **Calendar** tab. It shows the day, season, time and weather. Use the buttons for rests, the next morning or travelling several days, and new weather is rolled for each day. Pick the climate and starting season to suit your world. Rests, travel and your own notes are logged.

## On phones

The Forge works on phones as well as computers. On a phone the header is one slim line with a tab menu; it slides out of the way while you scroll or type and comes back when you scroll up (tap **▾ Show tabs** for the full header). On **My Characters** a jump bar takes you straight to HP, Attacks, Spells, Gear or Notes. On **Spells**, tap **Filters** to narrow the list. Buttons are bigger on touch screens, and pop-up windows always keep their buttons in view.

## Importing characters

On **My Characters**, press **⬆ Import character** and choose a character file from the **5e Companion App** (in the app, open the character and use Export or Share) or a **fillable PDF character sheet** (one you can still type into, like the official 5e sheet). Pick the 2014 or 2024 rules. You'll see what matched, what becomes homebrew and anything that couldn't come across, then press **Import**. The Forge keeps the character's ability scores, skills, gear, coins, spells and story, and works out the rest itself, so levelling up, rests and dice all work.

Subclasses, species, backgrounds, feats and spells the Forge doesn't have are added to **Homebrew** automatically, with their rules text from the file. A PDF has only names, so homebrew made from a PDF has no rules text: add it in the Homebrew tab. A scanned or "flattened" PDF can't be read. If a player imports while signed in, that new homebrew waits for the DM: it appears under **Waiting for approval** on the DM's Homebrew tab, and only that player's character uses it until the DM approves it. If the DM doesn't approve a subclass, feat or spell, it's taken off the character; a species or background stays, with a note to choose another with the DM.

## Lore and MythWeaver

Each campaign in the **Campaign Tracker** has a **Lore** tab for places, items, monsters, encounters and anything else worth remembering. Search it, filter by type, tap an entry to read it, and use **+ Add entry** or **Edit** to write your own (you can use **bold**, *italic*, # headings and - lists). Parts marked 🔒 DM only are just for you. An entry with a picture link can be shown on the TV.

To bring in a campaign from **MythWeaver**, export your account data from MythWeaver, then press **⬆ Import campaign** in the Campaign Tracker and choose the file. Tick the campaigns and characters you want. Sessions go to Sessions, NPCs to NPCs, everything else to Lore, and characters to My Characters. Your MythWeaver account details aren't kept. Importing the same campaign again updates it and keeps anything you added in the Forge. Lore is stored in this browser with the campaign, so it's in your 💾 Backup file; a big campaign takes a good share of the browser's space, and the import window tells you how much.

## NPC pictures

On a campaign's **NPCs** tab, every NPC has a picture frame. Press **🖼 Add picture…** to pick one from your computer, or **🔗 Link** to use a picture link that starts with https://. Press **📺 TV** to show it on the players' screen. Only the picture is shown, never the NPC's notes, and it keeps its shape. Pictures you add are kept on this computer (not in backups); links work anywhere.

## Session recaps

On a campaign's **Sessions** tab, press **Write a recap**. It collects what has happened since the last recap: fights finished, XP, quests completed or failed, chapters, loot handed out, and the calendar's log. It saves all of that as a new session you can edit.

## World

The **World** tab is where you build your setting: regions, cities, towns, villages, districts, taverns, shops, temples, dungeons, wilderness and landmarks.

- **+ Place** adds one. Give it a name, a type and a description, and choose what it's **Inside**, for example a tavern inside a district inside a city. The tree on the left shows how they nest; ▸ opens a place and ▾ closes it.
- A place's page lists the **places inside** it and the **NPCs here**, including NPCs in the places inside it, grouped by where they are. **+ New NPC here** adds one, and **Move an NPC here** files an existing NPC there. Click an NPC to open it on the NPC tab.
- **Map:** each place can have a map. **🖼 Upload a map picture…** (a city, a region or a battle map), **🎲 Generate a dungeon map**, or use the map that's open on the Dungeon Map tab. Click the map or press **Open on Dungeon Map** to add room notes, show it on the TV and reveal it with fog. On the Dungeon Map tab, **Save to a World place** keeps your changes with the place. Map pictures are kept on this computer, like other imported maps.
- **In campaigns:** tick a campaign to show the place in that campaign's **Lore** tab. Editing it there or on the World tab changes both. Places already in your campaigns' Lore, including ones imported from MythWeaver, are added to the World by themselves. MythWeaver places are also put inside each other, worked out from their text: a tag naming another place, a Location section, or wording like "an inn in Riverford". A place only goes inside a bigger one, and anything you move yourself stays put.
- Renaming a place renames it for every NPC and campaign. Deleting one moves the places and NPCs inside it up a level.
- The World is saved in this browser and is in your 💾 Backup file. **Export JSON** on a campaign includes the places it uses, with their nesting.

## Your NPCs

The **NPC** tab lists every NPC from all your campaigns under **Your NPCs**, with a tick box for each campaign:

- Tick a campaign to put that NPC in it. An NPC can be in several campaigns at once.
- Click an NPC's name to change its name, role, attitude or notes. A change made here, or in a campaign's NPCs tab in the Campaign Tracker, shows in every campaign that NPC is in. So does its picture.
- **Places:** use **📍 Move to…** on an NPC to file it under a place from the **World** tab, or **＋ New place…** to make one. The tabs above the list show one place at a time (a city's tab includes the places inside it), or **No place** for NPCs not filed yet. The Campaign Tracker's NPCs tab has the same tabs and a place picker on each NPC.
- Untick every campaign and the NPC stays in the list, marked "Not in a campaign". **+ New NPC** adds one there (or straight into the campaign you're viewing).
- **✕** deletes an NPC from every campaign.
- Search the list, or show one campaign's NPCs only.
- NPCs you summon and **Save to campaign**, and NPCs from an imported campaign, appear here too. MythWeaver NPCs tagged with one of the campaign's places are filed under it.

## Items and spells from imported campaigns

When you bring in a campaign with **⬆ Import campaign** in the Campaign Tracker, its custom items and spells come along, so you can hand them out:

- **Custom items** appear in **Items → Custom**. Choose a character in "Give items to" and press **Give** or **Buy**.
- **Spells** appear in **Homebrew** (only the DM can add homebrew when signed in), and then in the spell lists.
- **From MythWeaver**, entries filed as items become custom items, entries filed or tagged as spells become homebrew spells, and monsters go to **Monster Manual → My monsters**. A monster whose MythWeaver text has a stat block (AC, hit points and the six scores) gets its numbers, traits and actions; one without is marked **needs stats** for you to finish in **Build a monster**. They all stay in Lore too. DM-only notes aren't copied onto them. Untick **Items, spells and monsters** in the import window to skip this.
- **Forge campaign files**: **Export JSON** saves your custom items, homebrew and custom monsters with the campaign, and importing the file adds them back. Monsters go to **Monster Manual → My monsters**. Files exported before 17 November 2026 don't hold these, so export them again first.

- **MythWeaver encounters** also go to the campaign's **Encounters** tab, ready to run. Monsters the text names, like "three goblins and a bugbear", are added with their AC and HP from the Monster Manual or your own monsters. They're read from the text, so check them.

Anything you already have isn't added twice, and importing the same MythWeaver campaign again updates its items.

## Keeping a backup

If you use the Forge without an account, everything is saved only in that browser. Press **💾 Backup** at the top of the page:

- **Download backup** saves one file with your characters, campaigns, homebrew, items, monsters, favourite spells and map fog.
- **Restore from backup** puts a backup file back, in the same browser or on another computer. It replaces what's there, so it asks first.

Signed-in accounts don't need this, because their data is saved on the server.

## One-time Netlify setup

1. Link this GitHub repo to the site: Project configuration → Build & deploy → Link repository, production branch `main`.
2. Turn on sign-in: Project configuration → Identity → Enable Identity. Leave registration **Open** so players can sign up.
   Optional: Emails → Confirmation template → allow sign-up without confirming email.
3. Deploy. The database is created and its tables applied automatically on the first deploy.

## Development

```bash
npm install
npm test          # API tests against a local Postgres
npm run build     # bundle src/portal.js
```

### Try the whole app on your computer (Windows, Mac or Linux)

No Netlify needed. Install [Node.js](https://nodejs.org) (LTS), then in a terminal (PowerShell or Command Prompt on Windows) inside this folder:

```
npm install
npm run dev
```

Open http://localhost:8899. Sign-in is a stand-in: any name, email and password works, and data lives in a temporary database that's emptied when you stop it with Ctrl+C. Use two browsers (or a private window) to be the DM and a player at once.

### Automated browser walkthrough (Mac/Linux shell)

Same stand-in login (Netlify's login doesn't run locally):

```bash
npx esbuild src/portal.js --bundle --format=esm --alias:@netlify/identity=./test/e2e/fake-identity.js --outfile=/tmp/portal-test.js
node test/e2e/server.mjs /tmp/portal-test.js 8899 &
node test/e2e/walkthrough.cjs /tmp
```
