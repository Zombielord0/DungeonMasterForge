# NPC pictures: design (short)

Date: 2026-11-16. Status: approved by the owner in chat (sketch shown; storage option A chosen).

- **Why:** the DM wants a face for each NPC in the Campaign Tracker, and wants to show it to the players. MythWeaver lore (piece 4) also carries picture links that need somewhere to go.
- **What:**
  - Every NPC entry on the Tracker's NPCs tab gets a picture frame beside its fields, with these buttons:
    - **🖼 Add picture…** (upload)
    - **🔗 Use a link**
    - **📺 Show on TV**
    - **✕ Remove**
  - With no picture, the frame is empty and only Add and Link show.
- **Storage (owner chose A):**
  - **Uploaded pictures:** shrunk to at most 2048 px (sharp enough for a TV) and stored in the browser's picture database, the same IndexedDB as map pictures (`dmforge-maps` / `images`), under the key `npc-<npc id>`. The NPC record gets `img: "npc-<id>"`. These pictures are not in 💾 Backup files and don't show on other devices, the same as map pictures. If the picture isn't on this device, the frame says so.
  - **Links:** the NPC record gets `imgUrl` (https only). Links work on any device and are in backups.
- **Show on TV:** goes through the existing handout path (`handoutShow`), starting the TV screen if it isn't running. Only the picture is sent, never names or notes.
  - A link from a site that won't let pictures be copied (cross-origin) can't be sent. In that case the toast says to use Add picture instead.
- **Alternatives considered:**
  - B, pictures saved inside the campaign: rejected because of the 5 MB browser limit.
  - Links only: rejected because the DM wants to upload their own pictures.
- **No distortion (owner, 2026-11-16):** pictures always keep their shape.
  - On the TV, the player screen already fits each picture inside the screen without stretching (`Math.min` scale) and fills the rest with black. A tall portrait gets bars at the sides; a wide one gets bars at the top and bottom. Small pictures are scaled up to fill the screen.
  - The NPC frame in the Tracker uses `object-fit: contain`, so it never stretches or crops a face.
- **Not included:** pictures for other lists (quests, loot), and cropping or editing.
- **Left to the builder:** the exact frame size (about 96 px square) and the layout on phones.
