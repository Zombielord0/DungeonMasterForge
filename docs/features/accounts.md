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

## The DM's own data saved to their account (2026-11-17)

- **What:** signed in as a DM (or with no campaign yet, after "Not now"), the Campaign Tracker, World places, Your NPCs, custom items and My monsters are saved privately to the account, so they're on every device the DM signs in on. Players (accounts that are only players) keep their browser as it was.
- **Server:** table `user_docs (user_id, id, data jsonb, version, updated_at, deleted_at)` (migration `20261117120000_user_docs.sql`). Routes in `netlify/lib/api.mjs`:
  - `GET /api/me/docs` → `{docs:[{id, data, version, updatedAt}], deleted:[ids]}`, this account's only.
  - `PUT /api/me/docs/:id {data, baseVersion, force?}` → `{version}`. The version check is part of the same `UPDATE … WHERE version = $base` (or `INSERT … ON CONFLICT DO NOTHING`), so two devices saving at once can't both win; the loser gets 409 `{current}`.
  - `DELETE /api/me/docs/:id` leaves a marker (`deleted_at`) so other devices drop their copy instead of uploading it again.
  - Limits: 4 MB per doc (a big MythWeaver campaign is about 1.4 MB), 40 MB per account.
  - pg sends a JS array as a Postgres array, so `data` is passed as JSON text with `$3::jsonb`.
- **Docs:** one per Tracker campaign (its id, `c-…`), plus `world`, `npclib`, `items`, `mymonsters` (`CLOUD_LISTS` in `src/app/04-storage.js`, each with its localStorage key, how to read its entries, and how to reload it).
- **Browser side: `Cloud`** in `src/app/04-storage.js`, started by the portal (`startDocs()` in `src/portal.js`, from `enter()` and "Not now").
  - `Store.mode` is `"cloud"`. Saves still go to the usual localStorage keys first (they're this account's copy on this device), then `Cloud.touch(id)` sends the doc 2.5 s later. The four list save functions (`worldSave`, `npcLooseSave`, `itPersist`, `mbSaveLib`) and `mwCommit` call `Cloud.touch`.
  - `dmforge.sync.v1` = `{owner, v: {id: version}, dirty: {id}, gone: {id}}`: whose copy this is, the last version seen, what hasn't reached the account yet, and deletes still to send. Unsent changes upload on the next visit; leaving the page (`visibilitychange`) sends them at once; failures retry every 15 s.
  - Start (`Cloud.start`): if this browser holds no account's copy, its own data is set aside in `dmforge.stash.v1` and the keys are cleared; another account's leftover copy is dropped. Then the account's docs are merged in: a doc changed here and on another device since this one last saved keeps the account's version and, for a campaign, adds this device's as "Name (copy from this device)"; for a list, both sets of entries are kept (`listUnion`). If the account can't be reached and this browser has this account's copy, it keeps working from it (`Cloud.offline`, badge "Saved on this device · will upload") and tries again every 30 s.
  - Once per account (`dmforge.stashOffered.<user id>`), the browser's own data is offered: "Add this browser's work to your account?". It stays set aside either way.
  - During a session, a 409 on a campaign asks "Keep this device's" (send again with the new version) or Cancel (load the other device's); a list merges and sends again.
  - Signing out (`Cloud.stop`) sends what's left, then `release()` clears the keys and puts the set-aside data back. If changes couldn't be sent, this account's copy stays (with a toast) and uploads at its next sign-in. Starting signed out also calls `release(false)`.
  - The 💾 Backup button stays hidden while signed in (`setBadge`), as before.
- **Not synced:** pictures (IndexedDB), map fog, favourite spells, and this browser's own characters (characters are shared per campaign by the portal).
- **Tests:** `npm test` (API) and `npm run test:sync` (`test/e2e/account-sync.cjs`: two devices, the offer, clashes, merges, deletes, offline, sign-out, a player).
