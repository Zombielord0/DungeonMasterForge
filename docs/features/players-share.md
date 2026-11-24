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

## Chat (2026-11-24)

Whispers became a chat (`src/portal.js`, "chat" section; `netlify/lib/api.mjs`, the `whispers` routes).

- **Conversations ("threads").** Each player has one private conversation with the DM, and the players share one **party chat**. **The DM never sees the party chat:** `GET whispers` leaves those rows out for the DM, and the DM can't post to it or mark it read. A player gets only their own DM conversation plus the party's.
- **Storage.** Rows stay in `whispers`. A player's reply is a row to the campaign's DM (the player sends `to: "dm"`; the server finds the DM). A party message has `to_user_id = 'party'`. One-to-one messages use `read_at`. A player's party read position is `chat_reads.last_read_id`. The API gives each row `{id, thread, from, fromName, to, toName, body, at, mine, read}`, where `thread` is `"dm"` or `"party"` for players and the player's id for the DM. A sender who has left shows as "A former player".
- **Screens.** Players use the Chat tab (still `#whispers`): DM and Party buttons with counts, and bubbles with a typing box (Enter sends, Shift+Enter starts a new line). A new DM message still shows the banner (`#whisperAlert`), with Got it and Reply. The DM uses the Chat card on the Party tab, which lists the players with counts; nothing is open until the DM picks a player. The Party tab button carries the total (`#partyN`).
- **Polling** (`startChat`/`stopChat`): every 3 seconds while a conversation is on screen, otherwise every 8; nothing while the page is hidden. A 403 (removed from the campaign) stops it quietly.
- **Redraws** replace only `.chat-list`, never the typing box, so a half-typed message survives. The list stays where the reader scrolled unless they were at the bottom. Each conversation keeps its own draft (`S.chat.drafts`).
- **Checks:** `npm test` (the chat API rules) and `npm run test:chat` (`test/e2e/chat.cjs`, port 8893).
