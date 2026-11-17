# Shared with players: the Journal, turn order on phones, shared rolls (2026-11-17)

Signed-in campaigns only. Code: `src/app/05-tracker.js` (what is shared), `src/portal.js` (publishing and showing it), `netlify/lib/api.mjs`.

## Server
- Table `campaign_shared (campaign_id, id, data, updated_at)` (migration `20261117130000_campaign_shared.sql`). Ids are `SHARED_IDS` = `journal`, `turns`.
- `GET /api/campaigns/:cid/shared` (any member) → `{journal: {data, updatedAt}, turns: {…}}`. `PUT`/`DELETE /shared/:id` are DM only; 1 MB cap.
- `POST /api/campaigns/:cid/rolls {characterId, text}` adds `"🎲 " + text` to the activity feed. Only the character's owner (or the DM) can. Roll rows have no `before`, so `logActivity` never folds an edit into them.

## What is shared (`journalFor(c)`, `turnsNow()` in 05-tracker.js)
- **Journal** = the party's Tracker campaign (`trackerId()` in the portal, the one linked on the Party tab):
  - quests with `players !== "No"`: title, status, giver. **Never the notes.**
  - sessions with `players !== "No"`: title, number, date, summary (shown with `mdHTML`).
  - the calendar day, season and weather.
  - Lore entries with `shared: true` ("Players see this in their Journal" in the Lore editor), without sections marked DM only.
  - Quests and sessions have a "Players see it" select (Yes/No; a missing value means Yes).
- **Turns:** the fight the DM put on phones with the encounter card's "📱 Show players" button (only shown when signed in as DM). It's kept in localStorage `dmforge.playersFight = {cid, eid}` (`playersFightGet/Set`, `playersFight`). The data is `{name, round, rows: tvInitRows(c, e)}`: names, whose turn, "Bloodied"/"Down". **Never HP numbers.** A Done fight is `null`.

## Portal
- DM: `publishShared()` runs after every poll (4 s). It sends each of `journal` and `turns` only when its JSON changed (`S.published`); `null` deletes it.
- Players: `loadShared()` every 30 s, or every 5 s while `turns` is set. It redraws the turn bar and, if open, the Journal.
- `renderJournal()` (`#journalMain` in `#view-journal`; the tab is in `ALL_VIEWS` and `PLAYER_VIEWS`, hidden when not signed in). The DM sees a preview built from their own Tracker.
- `renderTurnBar()` (`#turnBar`, fixed bottom-left, clear of the roll dock): a `<details>` with "⚔ Fight · Round N · Now: X · Next: Y", or **"Your turn!"** (class `yours`) when the current name is one of the player's characters. The open state survives updates.
- Rolls: `rollLog` calls `Portal.rolled(c, e)` → `shareRoll`, only for a player who ticked "Share my rolls with the DM" in the roll dock (`[data-rdshare]`, localStorage `dmforge.shareRolls`, off by default) and only for a character synced to the campaign.

## Tests
`npm test` (API) and `npm run test:share` (`test/e2e/players-share.cjs`, port 8895): the Journal hides what it should, the DM's preview, turn order on a phone with Bloodied and Your turn!, and rolls private until ticked.
