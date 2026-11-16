# Optional Campaign Setup Implementation Plan

> **Superseded (2026-11-16):** the owner says this was fixed on the live site through Netlify, so this plan is not being carried out.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a new DM can get past the campaign setup screen without typing a name, can name or rename the campaign later, and can skip setup entirely for now.

**Architecture:**
- **Server:** one new DM-only API route renames a campaign.
- **Sign-in screen (`src/portal.js`):** the name fields become optional, and a "Not now" link is added.
- **Account window:** gets a Rename box for the DM.
- **Remembering "Not now":** the skip is kept per user in localStorage, so the screen doesn't come back on every reload.

**Tech Stack:** vanilla JS (esbuild bundles `src/portal.js`), the Netlify function API in `netlify/lib/api.mjs`, node:test with PGlite, and Playwright.

**Spec:** agreed in chat on 2026-11-16, with no separate doc. The owner approved all three points:
1. Campaign name and "Your name" are optional; the box shows "New Campaign" as a hint.
2. A DM-only "Rename campaign" in the Account window.
3. "Not now: use the DM tools in this browser" on the setup screen.

## Global Constraints

- Blank campaign name → "New Campaign"; blank DM name → "DM". The server already does this in `POST campaigns`.
- Campaign names are at most 80 characters (`clean(p.name, 80)`).
- Only the DM may rename. A player gets 403 "Only the DM can do that" (`dmOnly()`).
- Commands must work on Windows: add `npm run test:setup`.
- Add a `NEWS` entry at the top of the list in `public/index.html`, in plain words.
- Never edit `public/portal.js` by hand. It's built by `npm run build`.

## Review Focus

- **Renaming after the party has synced:** the DM's Campaign Tracker campaign is found by name (`trackerId`). The rename must pin the current tracker link first, so the party list doesn't split into a second Tracker campaign.
- **Saving a blank or all-spaces rename** → refused with "Give the campaign a name"; the old name is kept.
- **"Not now", then reload** → the user stays in browser mode without the setup screen. Creating or joining from the Account window later clears the skip.
- **A player opening the Account window** → no Rename box.
- **"Not now" for a user who already has campaigns** → the link isn't shown. The existing "Back to …" link covers them.

---

### Task 1: Rename route on the API

**Files:**
- Modify: `netlify/lib/api.mjs` (after the `dmOnly` definition, before `// ---- members ----`)
- Test: `test/api.test.mjs` (a new subtest inside "full campaign flow")

**Interfaces:**
- Produces: `PUT /api/campaigns/:cid` with body `{name}`. It returns `200 {id, name}`, `400 {error:"Give the campaign a name"}` for a blank name, and `403` for a non-DM.

- [ ] **Step 1: Write the failing test.** Add a subtest `"only the DM can rename the campaign"` to "full campaign flow":

```js
await t.test("only the DM can rename the campaign", async () => {
  assert.equal((await call(AVA, "PUT", `campaigns/${cid}`, { name: "Mine now" })).status, 403);
  assert.equal((await call(DM, "PUT", `campaigns/${cid}`, { name: "   " })).status, 400);
  const r = await call(DM, "PUT", `campaigns/${cid}`, { name: "  Embers of Velmor  " });
  assert.equal(r.status, 200);
  assert.equal(r.body.name, "Embers of Velmor");
  const me = await call(AVA, "GET", "me");
  assert.equal(me.body.campaigns.find(c => c.id === cid).name, "Embers of Velmor");
  await call(DM, "PUT", `campaigns/${cid}`, { name: "Ashes of Velmor" }); // later subtests may use the name
});
```

Also add a blank-name create check to the same file, as a separate top-level test:

```js
test("a DM can create a campaign without naming it", async () => {
  const r = await call({ id: "u-new", email: "new@example.com" }, "POST", "campaigns", {});
  assert.equal(r.status, 201);
  assert.equal(r.body.name, "New Campaign");
  assert.equal(r.body.displayName, "DM");
});
```

- [ ] **Step 2:** Run `npm test`. Expected: the rename subtest FAILS (404 instead of 403). The blank-create test PASSES already.
- [ ] **Step 3: Implement the route.** When `!b && m === "PUT"`: call `dmOnly()`, then `name = clean(p.name, 80)`. If it's empty, throw `HttpError(400, "Give the campaign a name")`. Otherwise `UPDATE campaigns SET name = $2 WHERE id = $1` and return `json({ id: cid, name })`.
- [ ] **Step 4:** Run `npm test`. Expected: all pass (13 tests).
- [ ] **Step 5:** Commit: "API: the DM can rename a campaign".

### Task 2: The setup screen, the Account window and the check

**Files:**
- Modify: `src/portal.js`:
  - `showSetup` (~line 167)
  - `enter` (~line 311)
  - `openAccount` (~line 248)
  - `trackerId` and `TRACKER_KEY` (~line 594) are only read
- Modify: `public/index.html` (`NEWS`, top entry), `README.md` (the sign-in section), `CLAUDE.md` (Portal notes and the commands list), `package.json` (the `test:setup` script)
- Create: `test/e2e/setup-screen.cjs`

**Interfaces:**
- Consumes: `PUT campaigns/:cid {name}` from Task 1.
- Produces:
  - The localStorage key `"dmforge.setupLater." + userId`, holding `"1"`.
  - `setupLater()`: closes the gate and enters browser mode while signed in.
  - Element ids: `#gLater` (the Not now button), `#aRename` (the account rename form) and `#aCampName` (its input).

- [ ] **Step 1: Write the failing check** in `test/e2e/setup-screen.cjs`. It's self-contained:
  - It builds the dev bundle with esbuild (same arguments as `npm run dev`, but output to `.dev/portal-setup.js`).
  - It spawns `node test/e2e/server.mjs .dev/portal-setup.js 8897`, waits for "running", and kills the server at the end.
  - It exits 1 on any failure or page error.

  It checks, in order:
  1. Create an account "Kit"; the setup screen shows; `#dCamp` has `placeholder="New Campaign"` and no `required`.
  2. Click `#gLater` → the gate closes; the account button text is the email.
  3. Reload → the gate stays closed (`#gate.open` is absent after 2 s).
  4. Click the account button → click "Join or start another campaign" → leave both fields blank → Create campaign → the gate closes, and the account button reads "DM · New Campaign".
  5. Account window → `#aCampName` value "New Campaign"; set it to "Velmor Reborn"; submit → toast; the account button reads "DM · Velmor Reborn".
  6. Reload → the account button still reads "DM · Velmor Reborn" (from the server); `localStorage["dmforge.setupLater.<id>"]` is gone.
  7. Rename to "   " → an error shows in the window, and the name is unchanged.
  8. A second account "Ava" joins with the code (read it from `#party .join-code`) → her Account window has no `#aRename`.
- [ ] **Step 2:** Add `"test:setup": "node test/e2e/setup-screen.cjs"` and run `npm run test:setup`. Expected: FAIL at check 1 (the `required` attribute is still there).
- [ ] **Step 3: Implement.**
  - **`showSetup`:**
    - Drop `required` from `#dCamp` and `#dName`. Add `placeholder="New Campaign"` and `placeholder="DM"`.
    - When `!S.campaigns.length`, add a footer like the `enter()` error screen's:

      ```html
      <div class="gate-foot"><button class="linkish" type="button" id="gLater">Not now: use the DM tools in this browser</button>
      <small class="muted">You can start or join a campaign later from the account button.</small></div>
      ```

    - Clicking it calls `setupLater()`.
    - Successful join or create removes the `setupLater` key.
  - **`setupLater()`:** sets the key, then runs `closeGate(); unhide(); applyMode(null); acctButton();`.
  - **`enter()`:** when `!S.camp` and the key is set, call `setupLater()` instead of `showSetup()`.
  - **`openAccount`:** when `isDM()`, add `<form id="aRename" class="gate-sec">` with "Campaign name" `#aCampName` (value `S.camp.name`, maxlength 80) and a "Rename" button. On submit:
    1. If `trackerId()` returns an id, save it under `TRACKER_KEY + S.camp.id`.
    2. Call `api("campaigns/" + S.camp.id, {method:"PUT", body:{name}})`. On error, show it with `gateError`.
    3. On success, set `S.camp.name` and the matching `S.campaigns` entry, run `acctButton()`, and toast `Renamed to “…”`.
    4. If the linked Tracker campaign's name equals the old name, rename it too and `Store.save` it.
    5. Re-render the Party tab if it's open (`renderParty()`).
- [ ] **Step 4:** Run `npm run build`, `npm run test:setup` and `npm test`. Expected: all pass. Rerun `test/e2e/walkthrough.cjs` against `npm run dev` to make sure the normal flow still works.
- [ ] **Step 5: Docs.**
  - A `NEWS` entry: id `2026-11-16-setup`, title "Start a campaign your way". Items:
    - "The campaign name is optional."
    - "DMs can rename their campaign from the account button."
    - "'Not now' lets a new DM look around before setting up a campaign."
  - README: a line in the sign-in section.
  - CLAUDE.md:
    - a short section listing `setupLater`, the key and the rename route
    - `npm run test:setup` in Commands
    - "11 should pass" changed to 13
- [ ] **Step 6:** Commit: "Optional campaign name, rename, and Not now on the setup screen".
