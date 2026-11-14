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
- If the DM and a player save the same sheet at once, whoever saves second is asked which version to keep.
- "Use without an account" keeps the old behaviour: DM tools, saved in this browser only.

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

Browser walkthrough with a stand-in login (Netlify's login doesn't run locally):

```bash
npx esbuild src/portal.js --bundle --format=esm --alias:@netlify/identity=./test/e2e/fake-identity.js --outfile=/tmp/portal-test.js
node test/e2e/server.mjs /tmp/portal-test.js 8899 &
node test/e2e/walkthrough.cjs /tmp
```
