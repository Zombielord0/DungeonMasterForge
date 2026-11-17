# Accounts: the DM setup screen

Code: `src/portal.js` and `netlify/lib/api.mjs`.

Moved here from `CLAUDE.md` on 2026-11-17, unchanged except that `public/index.html` now means the files in `src/app/` (see "How the page is built" in `CLAUDE.md`).

## DM setup screen (2026-11-17)

- **The setup screen** (`showSetup` in `src/portal.js`): `#dCamp` and `#dName` aren't required, with the placeholders "New Campaign" and "DM". The server already fills those in for blanks in `POST campaigns`.
  - A user with no campaigns gets "Not now" (`#gLater` → `setupLater()`). It sets localStorage `dmforge.setupLater.<user id>` and enters browser mode while signed in.
  - `enter()` honours the key. Creating or joining a campaign removes it.
- **Rename:** `PUT /api/campaigns/:cid {name}` is DM-only (403 otherwise; 400 "Give the campaign a name" for a blank). The Account window (`openAccount`) has `#aRename` / `#aCampName` for the DM.
  - Before renaming, it pins the party's Tracker campaign (`TRACKER_KEY`), because `trackerId` matches by name. It renames that Tracker campaign too if its name matched the old one.
- **Tests:** `npm run test:setup` (`test/e2e/setup-screen.cjs`). It builds the portal with esbuild's JS API and starts `test/e2e/server.mjs` on port 8897. The two rename/create API tests are in `npm test`.
