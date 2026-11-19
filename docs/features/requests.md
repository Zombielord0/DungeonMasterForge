# Feature requests (the Requests tab, 2026-11-19)

The owner asked for a tab where people request features with everything needed to build them. Their choices: stored in the app's database; signed-in people send and see their own; only the owner sees all; the owner is set with a Netlify setting; one optional screenshot, with a note that screenshots make approval more likely.

## Data
- Table `feature_requests` (`netlify/database/migrations/20261119120000_feature_requests.sql`): `id`, `user_id`, `user_name`, `user_email`, `data` (jsonb), `image` (a `data:image/jpeg|png|webp` URL or null), `status` (`new`, `planned`, `in-progress`, `done`, `declined`), `reply`, `created_at`, `updated_at`.
- `data`: `title`, `kind` (feature/change/bug), `area` (a part of the Forge), `who` (players/dm/both), `problem`, `idea`, `steps`, `example`, `rules`, `edition` (none/2014/2024/both), `often`, `devices[]`. The server keeps only these, trims them and checks the choices (`requestData` in `netlify/lib/api.mjs`).

## The owner
- `FORGE_OWNER_EMAILS` (Netlify environment variable, comma-separated emails, case doesn't matter). `isOwner(user)` in `api.mjs`; `/api/me` returns `owner`.
- Until it's set, nobody sees all requests.

## API (`/api/requests`, signed in)
- `GET`: your own (owner: everyone's, with `userName` and `userEmail`).
- `POST`: send one. At most 20 a day each. The screenshot must be a JPEG, PNG or WebP data URL under 700 KB (no SVG).
- `PATCH /:id` (owner only): `status`, `reply`.
- `DELETE /:id`: your own while it's `new`, or any for the owner.

## The tab (`src/app/20-requests.js`)
- Side panel: the form (`RQ.draft`); the screenshot is shrunk in the browser to at most 1400 px and saved as JPEG (`rqShrink`).
- Main column: Your requests or, for the owner, All requests with status chips (`RQ.filter`, default All so a request stays in view while it's marked and answered), a status menu, a reply box, Delete, and **📋 Copy as a brief** (`rqBrief`: Markdown with every section, for a Claude chat; the screenshot stays in the tab).
- It talks to the server through `Portal.api` (added to `portal.js`, with `Portal.signedIn` and `Portal.myName`). `requests` is in the DM's and the players' tab lists. Without signing in, the tab asks you to sign in.
- Every text is escaped with `esc()`; the screenshot is only shown when it's a `data:image/jpeg|png|webp` URL.
- Checks: `npm test` (the API) and `npm run test:requests` (both sides, against the local copy; `SHOTS=<folder>` saves screenshots).
