# Chat history

A record of the conversations that built the portals and later features. It lists what was asked for, what was decided and why, and what shipped. The newest entries are at the bottom. Add to it whenever the Forge changes.

Personal details (names, email addresses) are left out on purpose: this repository is public.

---

## Before this repo: the earlier chat (claude.ai)

- The Forge started as a single-page app. It saved to the owner's private claude.ai storage, which only the owner could read.
- **Goal:** split it into two portals.
  - **Player portal:** character creator, My Characters, Spells, Items.
  - **DM portal:** everything, plus every player's characters, each change they make, and private whispers to one player.
- **Hosting:** the site was already live on Netlify's free plan at dungeonmasterforge.netlify.app, so the portals go there. Opening the claude.ai copy needs a claude.ai account and an invite, which rules it out for players.
- **Backend choice:** three options were weighed.

  | Option | Verdict |
  |---|---|
  | A. Netlify's own database, functions and login | **Chosen**: one account, deployable from here, changes reach the DM in 3–5 s |
  | B. Firebase | Instant updates, but a second service to set up |
  | C. Supabase | Free projects sleep after a week of no use |

- **Proposed flow:** the DM creates a campaign and gets a short join code. A player makes an account (email and password) and enters the code once. The DM gets a Party tab with an activity feed and whispers, and players get a whisper inbox with a badge.
- **Open question carried into this repo:** should the DM be able to edit player sheets, or only watch?

## 2026-11-14: Claude Code session

### Portals (PR #1, merged)
- **Decision:** the DM **can edit** player sheets. Saves carry a version number. If two people save the same sheet at once, the second is asked which version to keep.
- The latest Forge HTML was uploaded to the repo and moved to `public/index.html`.
- **What was built:**
  - Netlify Identity sign-in.
  - Netlify Database tables: campaigns, members, characters, activity, whispers.
  - One API function at `/api/*` that checks the user's role on every request.
  - A player portal limited to Characters, My Characters, Spells, Items and Whispers.
  - A DM Party tab with sheets, the join code, the player list with Remove, the activity feed and whispers.
  - Quick edits fold into one activity line, such as "HP 44 → 31".
  - "Use without an account" keeps the old browser-only mode.
  - Characters already saved in a browser are offered for upload on first sign-in.
- **Deploy hurdle:** Netlify blocked the preview with "Unrecognized Git contributor" because the repo was private and the commits were pushed by the Claude app. None of these fixed it:
  - recording the commits under the owner's GitHub noreply address;
  - removing the co-author line;
  - linking GitHub to Netlify.

  It cleared once the **repo was made public**.
- **Changes requested after testing the preview** (all shipped in PR #1):
  - Whispers are pinned in a banner at the top of the player's screen until "Got it", come back after a reload if unread, and show the count in the tab title. Players check for them every 8 s.
  - Player characters are added automatically to the matching **Campaign Tracker** party on the DM's side. The DM can pick which Tracker campaign on the Party tab.
- Merged and live. The production database was created on the first deploy.

### Monster Manual, monster builder, companions (PR #2, merged)
- **Monster Manual:** every SRD 5.2 (2024, 331) and SRD 5.1 (2014, 325) monster, from Open5e's copies of the SRDs (CC BY 4.0).
  - Filters, grouping by CR, stat blocks.
  - **+ Add** puts a monster into a campaign's encounter "Add enemy" list, or straight into a chosen encounter.
  - Both editions of the same monster can sit side by side.
  - Only SRD monsters are included, so not the whole Monster Manual (no beholder, mind flayer and so on).
- **Monster builder**, asked for as "a custom monster that can be manually built":
  - Every stat block field, with traits, actions, bonus actions, reactions and legendary actions.
  - A quick attack maker and a live preview.
  - Saves to "My monsters" in the browser. Can start from "Edit a copy" of any SRD monster.
- **Companions**, asked for so "rangers and druids should be able to query those like the spells section can query prepared spells":
  - A Companions & Wild Shape section on My Characters, with a "Find a beast" search filtered by rules:

    | Who | Option | What the search allows |
    |---|---|---|
    | Druid | Wild Shape | CR ¼ / ½ / 1 at levels 2 / 4 / 8, with fly/swim limits |
    | Ranger | Beast companion | Medium or smaller, CR ¼ or lower |
    | Find Familiar | Familiar | The 2014 familiar list, or any CR 0 beast in 2024 |
    | Find Steed | Steed | The 2014 steed list |

  - Beast Master isn't in either SRD, so rangers get the 2014 Beast Master limits.
  - Each companion has a nickname, HP and notes. The DM's feed shows "gained companion Wolf".
- Merged and live.

### Loading fix (PR #3, merged)
- **Reported:** "the loading for everything after a refresh seems off and takes some time."
- **Cause:** after a refresh with a saved session, the page stayed hidden until an 8-second safety timer ran out. The code that closed the sign-in screen never uncovered the page.
- **Fix:** the page is uncovered as soon as the sign-in check ends. The portal from the last visit (campaign, role, tabs) shows at once while characters load.
- **Result:** about 8 s → about 0.4 s in testing. The embedded spell, item and monster data was measured and found not to be the problem.
- Merged and live.

### Docs
- This file and the rewritten README were added.

---

## Known limits and ideas not done yet
- **Browser-only data:** the Campaign Tracker, adventures, maps and My monsters are only in the DM's browser, not the shared database.
- **Missing official content:** the 2024 Primal Companion (Beast Master) stat blocks and non-SRD monsters aren't available to include.
- **Editing the HTML elsewhere:** a version of the Forge HTML made in another chat must start from `public/index.html`, or the portal, monster and companion features are lost.
- **Delay:** the DM sees changes after a few seconds, because the page checks for updates rather than receiving them live.
