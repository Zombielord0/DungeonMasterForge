# DM tools: shops, random encounters, calendar, recaps, backup

Code: shops in `src/app/11-items-shops.js`; random encounters, the calendar and recaps in `05-tracker.js`; backup in `04-storage.js`.

Moved here from `CLAUDE.md` on 2026-11-17, unchanged except that `public/index.html` now means the files in `src/app/` (see "How the page is built" in `CLAUDE.md`).

## Shops (2026-11-15)

- **Making a shop.** `shopMake({type, size, level, seed, ed, rar?, amount?, moodIx?})` builds a shop from `IT.data`, and the same seed always gives the same shop. It returns `{seed, type, size, level, ed, name, label, keeper, mood, moodIx, stock, rar?, amount?}`, with each stock item as `{id, n, cat, g, kind, rk, r, att, w, gp, c, qty}` (`gp` is after the shopkeeper's manner).
  - **Shop kinds** are in `SHOPS` (`general`, `smith`, `bowyer`, `alchemist`, `magic`, `temple`). Each has a `gear` filter, a `magic` filter, and stock counts for village, town and city.
  - **Magic rarity (Automatic)** is capped by settlement and level: villages sell up to uncommon; towns up to rare from level 5; cities up to very rare from level 11.
  - **Options (2026-11-17):** `rar` (rarity ranks 0 to 4) stocks only those rarities and at least 2 magic items, for kinds with a `magic` filter. `amount` (`SHOP_AMOUNT`: small ×0.5, normal, large ×1.5). `moodIx` picks a `SHOP_MOODS` entry.
  - **Old shops stay the same:** with none of the options set, the random calls and the `makeRng` key are as before. The options join the key only when set. Don't change that order.
  - **Prices:** the shopkeeper's manner (`SHOP_MOODS`) scales them, and `shopNiceGp` rounds them.
- **Made in the World builder (2026-11-17).** `#itShopBtn` opens the World tab's builder on Shop (`wbStart("shop")`). It's hidden when `Portal.views` has no `world` (signed-in players). See `npcs-world.md` for the builder.
- **Saved shops.** A World place keeps the whole shop in `p.shop`: the `shopMake` result plus `markup` (percent, −90 to 500), `sale` (the last "For sale" text written) and, per stock item, `own` (the DM's own price).
  - `shopEnsure(p)` fills an older `p.shop` (params only) from `shopMake` on first open. The same seed gives the stock it always had. It marks the matching "For sale" section `auto`.
  - `shopPrice(s, x)` = `own`, else `shopNiceGp(gp × (1 + markup/100))`. `shopSaleText(s)` is the "For sale" list (in stock only, first 24).
  - `shopOpen(p)` sets `IT.shop = p.shop` (the same object) and `IT.shopPlace`, then shows the Items tab. `shopSave()` rewrites the `auto` "For sale" section only while it still equals `sale` (hand edits are kept), then `worldSave()` and `wpSyncOut(p)`. It does nothing if the place is gone.
  - The panel (`shopRender`): `#shopMarkup` (updates prices in place on input, saved 300 ms later), price inputs `[data-shopown=i]` (saved on change; ≤ 0 or empty clears `own`; `.shop-own` ✎ marks one), `#shopRestock` (`shopRestock`: new stock and seed, keeping name, keeper, manner, markup and `own` prices by id), `#shopWorld`, Buy `[data-shopbuy=i]`.
  - Buy calls `itBuy` with the shown price, and lowers `qty` only if the coins actually changed.
- **Tests:** `npm run test:shop` (`test/e2e/shop.cjs`).

## Random encounters (2026-11-15)

- **Building a fight.** `randomEncounter(rng, env, level, party, diff)` picks monsters from the 2014 Monster Manual data (`randMonsters()`, which reads `#monsterData`), filtered by their `env` tags. It sizes the group against `partyThr` with the usual `mult` multiplier, capped at 1.5× the target. It returns `{groups, hook}`.
  - When nothing fits, it falls back to the weakest monster that lives there.
- **On the page.** `randHTML()` draws the controls at the top of the Encounters tab: `#randEnv`, `#randDiff` and `#randRoll`, with the current choices kept in `RAND`.
  - `randRoll(c)` creates the encounter with `kind:"random"` and the hook in its notes, and takes AC and HP from the Monster Manual.
- **Places** are listed in `RAND_ENVS`; the hooks in `RAND_HOOKS`.
- **Tests:** `npm run test:random` (`test/e2e/random-enc.cjs`).

## Calendar and weather (2026-11-15)

- **Data.** `c.cal = {day, min, climate, season, weather, log}`. `calEnsure(c)` creates it, `calAdvance(c, minutes, note)` moves the clock and rolls each new day's weather, and `calLog` keeps the 200 most recent entries.
- **Weather.** `calWeather(seed, day, climate, season)` follows the usual d20 tables for temperature, wind and precipitation, seeded by campaign and day. It returns `{day, f, sky, text, effects}`.
  - `effects` holds the rules text for strong wind, heavy rain or snow, extreme cold and extreme heat.
  - Climates are in `CAL_CLIMATES`; the season changes every 91 days (`calSeason`).
- **On the page.** The Campaign Tracker has a "Calendar" sub-tab (`calHTML`), with `data-cal` buttons and the `#calClimate`, `#calSeason` and `#calDay` fields.
- **Tests:** `npm run test:calendar` (`test/e2e/calendar.cjs`).

## Session recaps (2026-11-15)

- **What goes in.** `recapMake(c)` collects everything since `c.recapAt`, and returns `{text, empty, mark()}`:
  - fights with status Done or with XP awarded, unless they have `e.recapped`
  - quests that are Completed or Failed, unless `q.recappedAs` already matches their status
  - chapters that are done, unless they have `ch.recapped`
  - loot with `givenTo`, unless it has `l.recapped`
  - calendar log entries newer than `c.recapAt`
- **Marking.** `mark()` sets those flags plus `c.recapAt` and `c.recapDay`, so the next recap only has what's new.
- **On the page.** `recapWrite(c)` adds `{title:"Session N", num, date, summary}` to `c.sessions` (newest first). `recapBarHTML()` adds the `#recapBtn` bar to the top of the Sessions tab.
- **Tests:** `npm run test:recap` (`test/e2e/recap.cjs`).

## Backup and restore (2026-11-15)

- **💾 Backup** (`#backupBtn`, beside the storage badge) appears only in browser-only mode; `setBadge` hides it when `Store.mode === "db"`. It opens `#backupModal`.
- **The file format:** `{app:"dmforge-backup", v:1, made, data:{key: raw localStorage string}}`, holding the keys in `BACKUP_KEYS`.
  - **When you add a new kind of saved data, add its key to `BACKUP_KEYS`.**
  - Settings are left out on purpose: offline mode, the header, What's new, and the portal's keys.
- **Functions:** `backupMake`, `backupSummary`, `backupInfo`, `backupOpen`/`backupClose` and `backupRestore(file)`.
  - Restoring checks the `app` marker, asks with `confirmBox`, writes every key in `BACKUP_KEYS` (removing ones the backup doesn't have) and reloads.
  - The last download time is kept in `dmforge.lastBackup`.
- **Downloads:** `saveFile` now falls back to a normal browser download (Blob and `<a download>`) when the Claude `downloads` helper isn't there. Before this, Download PNG and Export JSON did nothing on the website.
- **Tests:** `npm run test:backup` (`test/e2e/backup.cjs`).
- **Pictures (2026-11-17):** backups are `v: 2` with `images: {key: data URL}` for every picture in `MAPIMG` (imported maps and NPC pictures; `MAPIMG.all()` and `MAPIMG.clear()`). `backupMake` is async. The window counts pictures and their size. Restoring a v2 backup clears the picture store and puts the backup's pictures back; a v1 backup keeps the pictures that are there (and says so).

## Treasure hoards (2026-11-19)

- `src/app/11b-hoard.js`. `hoardRoll(tier, seed, ed)` gives `{tier, seed, ed, coins:{cp,sp,gp,pp}, groups:[{kind:"gem"|"art", name, each, qty}], items:[magic item records from IT.data]}`. Tiers are challenge bands 0–4, 5–10, 11–16, 17+ (`tierOf(level)` for a campaign).
- The numbers and lists (`HOARD_COINS`, `HOARD_TREASURE`, `HOARD_MAGIC`, `HOARD_GEMS`, `HOARD_ART_*`) are the Forge's own, not the DMG tables (not in the SRD). Magic items come from the chosen edition's rules data, weighted by rarity per band; with too few items of a rarity (the SRD has very few commons) it steps up a rarity, then down. No item twice in one hoard. Artifacts and unpriced items are left out.
- `hoardToLoot(c, H)` adds one Loot entry for the coins, one per gem or art group and one per magic item (`{id, item, holder, value, notes}`), so Give on the Loot tab hands them out.
- **Items tab:** `#itHoardBtn` opens `#itHoard` (`HOARD.H`, campaign picker `HOARD.camp`). **Campaign Tracker → Loot:** `[data-hoardopen]` rolls `HOARD.T` for the campaign's level, shown above the list, and adds to that campaign.
- **Encounters (2026-11-19, owner's request):** a hoard can be for an encounter (`H.enc`). The panel's Encounter menu (Items tab: of the chosen campaign; Loot tab: of this campaign) and each encounter card's **💰 Hoard** button (`data-ea="hoard"`) set it; `hoardEncTier(e)` picks the band from the encounter's toughest monster (or its level). `hoardToLoot` then adds `encId` and "From <encounter>" to each Loot entry and appends a one-line summary to `e.treasure`, which the encounter card shows.
- **Layout:** `.hoard-top` (title and ✕), `.hoard-ctl` (band and Roll again, wrapping on phones), `.hoard-dest` (campaign and encounter), `.hoard-acts`. `test:hoard` checks everything fits a 360px phone.
- Check: `npm run test:hoard`.

## The fight window (2026-11-25)

The owner asked for condition drop-downs for foes and heroes in a fight, and reminders for concentration and spells' saves. They then chose a full-screen fight window. Design: `docs/superpowers/specs/2026-11-25-fight-window-design.md`. Code: `src/app/05b-fight.js`. Check: `npm run test:fight`.
- **Opening:** **▶ Run fight** on an encounter card (`data-fopen`). The window (`#fightWin`) sits on `<body>` and runs the encounter's own handlers (`encClick`, `onEncField`), so `data-ea` (roll, next, dmg, heal, tv, undo) and `data-ef` (heroes' initiative) work in it over any tab. `renderTracker` and `rerenderEnc` redraw it. Close it with ✕ or Esc.
- **Creatures** are keyed `foe:<enemy id>` and `pc:<party id>` (`fightWho`, `fightAll`).
- **Conditions:**
  - foes keep `m.conds` (`{id, k, ends, save {ab, dc}, src {by, name, spell}, castId, untilRound, seenStart}`);
  - heroes' conditions go on their sheet (`c.conds[k]`, or `c.exh` for Exhaustion) through `pcPersist`, with the details in `e.pcConds[partyId]`;
  - the old free-text `m.cond` shows as a note chip.
- **Reminders** (`e.prompts`), answered one at a time with Saved / Failed or Kept / Lost:
  - `fightOnTurn` (called from both Next turn paths) asks for end-of-turn and start-of-turn saves, ends "next turn" conditions, and ends conditions whose rounds have run out;
  - `fightOnFoeDamage` asks a concentrating foe for a CON save (DC max(10, half the damage)), and ends its cast at 0 HP;
  - a hero's `concCheck`, set by the sheet when damaged, shows as a reminder too.
- **Casts** (`e.casts`): adding a condition with a caster, a spell and Concentration records `{by, spell}`. A foe gets `m.conc`; a hero gets `concStart` on their sheet. A new concentration spell ends the caster's last one. `fightEndCast` removes every condition from that cast. `fightSync` ends casts whose hero stopped concentrating anywhere, or whose foe is down.
- **Filled in for you:**
  - `fightCasterDC`: a hero's `c.spell.dc`, or "spell save DC N" or "DC N" in the monster's stat block;
  - `fightSpellInfo`: the save from `sv` or the wording, the first condition named in the text, end or start saves from "end/start of each of its turns", concentration from `co`, and rounds from the duration;
  - `fightCasterSpells`: a hero's prepared spells, or the spells named in the monster's stat block.
- **Undo** (`combatSnapshot`) now covers foes' `conds` and `conc`, and the encounter's `prompts` and `casts`. Heroes' sheet conditions aren't undone.
- **Unchanged:** the TV and players' phones still get only names, whose turn, and Bloodied or Down.
- **The TV's turn order** (2026-11-25, owner's request) shows each creature's condition names: `tvInitRows(c, e, { conds: true })`, with foes' from `m.conds` and heroes' from `e.pcConds` and their sheet. It never shows a foe's free-text note. Players' phones (`turnsNow`) don't get conditions.
- **Closing the TV window** (noticed within 2 seconds), or Stop, calls `hostOffReset`. That clears `HOST.enc` and `HOST.atlas`, returns a handout to the map, and redraws the Tracker or World, so every TV button reads Show on TV again.
- **From the Dungeon Map** (2026-11-25, owner's report): a room's **Run this fight** (`mapRunEncounter`)
  - reuses that room's unfinished fight (same map name and room), or adds one;
  - rolls the monsters' initiative if nobody has any (round 1, turn set, `fightOnTurn`);
  - puts it on the TV whenever hosting, replacing any other fight;
  - opens the fight window over the map.

  The window is attached to `<body>` (z-index 62, above the map's Run at 60) and runs the encounter's own handlers itself: `encClick` (the Tracker's `data-ea` handler, now a named function) and `onEncField`. That way it works over any tab. Esc closes the fight window before the map's Run.
