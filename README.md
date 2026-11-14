# Dungeon Master's Forge

A D&D 5e toolkit for running a campaign, with separate portals for the DM and the players.

**Live:** https://dungeonmasterforge.netlify.app
**History:** [docs/CHAT_HISTORY.md](docs/CHAT_HISTORY.md) lists what was asked for, what was decided and what shipped, in order. Read it before changing anything.

## What's in it

| Tab | Who sees it | What it does |
|---|---|---|
| Adventure | DM | Generates adventures |
| NPCs | DM | Generates NPCs |
| Villains & Monsters | DM | Three modes. **Forge a creature** generates one. **Build a monster** is a manual builder with a live stat block. **Monster Manual** lists every SRD 5.1 (2014) and SRD 5.2 (2024) monster, plus "My monsters". Any of them can be added to a campaign or straight into an encounter. |
| Characters | Everyone | Character creator |
| My Characters | Everyone | Full sheets: HP, inventory, prepared spells, **Companions & Wild Shape** (for druids, rangers, Find Familiar and Find Steed) |
| Spells, Items | Everyone | SRD 5.1 / 5.2 spells and items |
| Dungeon Map, Campaign Tracker | DM | Maps, campaigns, encounters, party |
| Party | DM | Every player's sheet (click to view or edit), the join code, the player list, an activity feed of changes, and whispers to one player |
| Whispers | Players | Private notes from the DM. New ones are pinned to the top of the screen until dismissed. |

### Portals and sign-in
- The DM signs in, creates a campaign and shares its join code. Players create an account and enter the code once.
- Characters are stored in a shared database, so the DM sees players' changes within a few seconds.
- When the DM and a player save the same sheet at once, whoever saves second chooses which version to keep.
- Player characters are added automatically to the matching Campaign Tracker party on the DM's side.
- **Use without an account** keeps the old behaviour: DM tools, saved in that browser only.

### Saved in the browser only
These are not in the shared database: the Campaign Tracker, adventures, maps, My monsters and favourite spells. They live in the DM's browser, so use Export JSON in the Tracker to back them up.

## Layout

- `public/index.html`: the Forge itself, a single page with the spell, item and monster data embedded. **Upload new versions of the HTML here.** If a version made elsewhere doesn't start from this file, the portal hooks, Monster Manual, builder and companions will be missing.
- `src/portal.js`: player and DM portals (sign-in, sync, Party tab, whispers, Tracker party). Bundled to `public/portal.js` at build time.
- `netlify/functions/api.mjs` and `netlify/lib/`: the campaign API at `/api/*`. `diff.mjs` writes the activity-feed lines.
- `netlify/database/migrations/`: database tables, applied automatically on deploy.
- `tools/convert-srd-monsters.py`: rebuilds the embedded monster data from Open5e's SRD files.
- `test/`: API tests (`api.test.mjs`) and a browser walkthrough with a stand-in login (`e2e/`).

## Hosting

- Netlify (site `dungeonmasterforge`), built from `main`. Every pull request gets its own preview link, with a separate copy of the database.
- Netlify Identity handles accounts and Netlify Database (Postgres) stores data. Both are set up on the site.
- The repo is public. Netlify blocked builds of commits pushed by others while it was private.
- Changes go through pull requests: try the preview, then merge.

## Development

```bash
npm install
npm test          # API tests against a local Postgres
npm run build     # bundle src/portal.js
```

Browser walkthrough with a stand-in login (Netlify's login doesn't run locally):

```bash
npx esbuild src/portal.js --bundle --format=esm --alias:@netlify/identity=./test/e2e/fake-identity.js --outfile=/tmp/portal-test.js
```

```bash
node test/e2e/server.mjs /tmp/portal-test.js 8899 &
```

```bash
node test/e2e/walkthrough.cjs /tmp
```

## Credits

Spell, item and monster data come from the System Reference Documents 5.1 and 5.2 by Wizards of the Coast LLC, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode). The data was compiled by the open-source [5e-database](https://github.com/5e-bits/5e-database) and [Open5e](https://github.com/open5e/open5e-api) projects.
