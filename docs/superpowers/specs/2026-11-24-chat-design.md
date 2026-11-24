# Chat: whispers become two-way chats, plus a party chat (design)

Date: 2026-11-24. Approved by the owner in chat.

## Why

Whispers only go one way today: the DM writes to one player, and the player can't answer. The owner wants a chat. The DM and each player can talk privately in both directions, and the players have a shared party chat of their own.

## What the owner decided

- **DM ↔ player chats:** one private conversation per player, both ways. Only that player and the DM see it.
- **Party chat:** one shared room for **the players only**. **The DM can't see it** ("I don't think the DM needs to see party chats").
- **No private messages between two players.**
- Not included: editing or deleting messages, pictures, live (push) delivery.

## Approaches considered

1. **Extend the existing `whispers` table (chosen).** It already stores the sender and the recipient, so a player's reply is a row going the other way. A party message is a row addressed to `party`. Old whispers show up in the new chats without being moved.
2. A new `chat_messages` table. Cleaner names, but the old whispers would have to be copied across, for no gain to players.
3. Live delivery (websockets or similar). Netlify Functions don't hold connections open, so it would need another service. Checking every few seconds is fine for a table chat.

## Design

**Data**
- `whispers` rows keep `from_user_id` and `to_user_id`. A player's message to the DM has `to_user_id` = the campaign's DM. A party message has `to_user_id = 'party'`.
- `read_at` still works for one-to-one messages. Each player's read position in the party chat is kept in a new small table: `(campaign_id, user_id, thread, last_read_id)`. *(My call.)*
- A migration adds whatever index the party queries need. Old rows stay valid.

**API** (`netlify/lib/api.mjs`, all under the existing campaign and membership checks)
- `GET whispers`: the DM gets every DM ↔ player message in the campaign, **never** party rows. A player gets their own DM ↔ player messages, plus the party messages if they're a player in the campaign.
- `POST whispers`, body `{to, body}`:
  - the DM may send to any player (as now);
  - a player may send to `dm` (the server resolves it to the campaign's DM) or to `party`;
  - anything else is refused.
  - The length limit stays at 2,000 characters, and empty messages are refused.
- `POST whispers/read`, body `{thread}`: marks a conversation as read for the caller. `thread` is a player's id (for the DM), `dm` or `party`.
- Party rows need the sender's display name, to label bubbles.
- **Removed players** lose access at once, because every route checks membership. A player who joins later sees the party chat's earlier messages. *(My call: like joining a group chat with its history.)*

**Player screen (Whispers tab, renamed "Chat")**
- Two conversations at the top: **DM** and **Party**, each with a red unread count.
- Speech bubbles: the other person's on the left, your own on the right, party bubbles labelled with the sender's name, and a time on each.
- A box at the bottom to type, with Send (Enter sends, Shift+Enter makes a new line).
- The banner for a new DM message stays, and gets a **Reply** button that opens the DM chat. Party messages only raise the count on the tab, with no banner. *(My call: a busy party chat shouldn't keep covering the screen.)*

**DM screen (Party tab)**
- The Whisper card becomes a **Chat** card: a list of players with unread counts on the left, and the selected conversation with a reply box on the right. On phones they stack.
- A red unread count on the Party tab button, so replies are noticed on other tabs. The DM's loop now polls for messages on every tab, not only Party.

**Polling**
- Every 3 seconds while a chat is open and the page is visible; otherwise every 8 seconds; nothing while the page is hidden (as now).

**Safety**
- All message text goes through `esc()`.
- The security reviewer runs, because this touches `netlify/`, `src/portal.js`, and one person's text in another person's browser.
- The key check: **the DM can never read party rows**, and a player can never read another player's DM chat.

**Tests**
- API tests (`test/api.test.mjs`) for every rule above, especially DM excluded from party and player A unable to read player B's chat.
- A Playwright check (`npm run test:chat`), with a DM and two players on `test/e2e/server.mjs`: reply, party chat, unread counts, the banner's Reply button.

**Other**
- A What's new entry in `18-news.js`, and notes in `docs/features/players-share.md`.

## Anti-goals

- The DM seeing party messages, even by accident (for example through the activity feed or a backup).
- A chat that loses a message the player typed when the screen redraws (keep the draft, as the Whisper box does now).

## Left to the builder

The exact CSS, the migration's name, and how the poll timers are shared between the DM and player loops.
