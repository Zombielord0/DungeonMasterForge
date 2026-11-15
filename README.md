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

## Session recaps

On a campaign's **Sessions** tab, press **Write a recap**. It collects what has happened since the last recap: fights finished, XP, quests completed or failed, chapters, loot handed out, and the calendar's log. It saves all of that as a new session you can edit.

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
