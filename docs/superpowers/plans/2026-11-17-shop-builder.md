# Shop builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make shops in one place, the World builder, with rarity, stock size and shopkeeper's manner, and let a saved shop keep its stock, take a markup, take the DM's own prices and be restocked.

**Architecture:** `shopMake` (in `src/app/11-items-shops.js`) gets three optional inputs and stays deterministic. A saved World place keeps the whole generated shop, with stock, in `p.shop`. The Items tab's shop panel edits that object in place and saves through `worldSave()`. The World builder (`src/app/06-npcs-world.js`) gets the new options and stores the previewed stock.

**Tech Stack:** Vanilla JS in global-scope files joined by `tools/build.mjs`; Playwright checks in `test/e2e/*.cjs`.

**Spec:** `docs/superpowers/specs/2026-11-17-shop-builder-design.md`

## Global Constraints

- Edit `src/` only; `public/` is build output. Each `npm run test:…` builds first.
- Same seed, same shop: with `rar`, `amount` and `moodIx` all missing, `shopMake` makes exactly the same random-number calls in the same order as today. The new inputs join the `makeRng` key only when set.
- Markup is a percent from −90 to +500. Shown price = `own` if set, else `shopNiceGp(gp × (1 + markup / 100))`.
- With `rar` set and a kind of shop that sells magic (`S.magic`), the shop has at least 2 magic items when the pool has them.
- Amount factors: small ×0.5, normal ×1, large ×1.5 of `S.count[si]`, rounded, at least 1.
- Restock changes only `stock` and `seed`. Name, keeper, manner (`moodIx`, `mood`), label and markup stay; `own` prices carry over by item `id`.
- No new localStorage key: shops live in `dmforge.world.v1` through `worldSave()`.
- The "For sale" section that players can see in the Journal holds only item names, shown prices and "(magic)".
- Comments inside one-line functions use `/* */`.

## Review Focus

1. **A signed-in player on the Items tab** (no World tab: `PLAYER_VIEWS` in `src/portal.js` lacks `world`). Hide `#itShopBtn` when `window.Portal && Portal.views && !Portal.views.includes("world")`. Test in Task 3.
2. **A shop whose World place was deleted while it's open on the Items tab.** Buying and editing still work on `IT.shop`; saving silently does nothing when `wp(IT.shopPlace)` is missing (no crash). Test in Task 2.
3. **Bad typing in the price boxes:** markup `abc`, `-500` or `9999`, and an own price of `-3` or `0`. Markup is clamped to −90..500 (NaN → 0). An own price ≤ 0 or NaN clears `own`. Test in Task 2.
4. **A shop saved before this change** (`p.shop` has only `type, size, level, seed, ed`). Opening it fills the stock that the same seed gave before, marks the matching "For sale" section `auto`, and doesn't change the place's name. Test in Task 2.
5. **Rarity ticked on a General store** (no `S.magic`): no crash, no magic items, and the builder shows the note. Test in Tasks 1 and 3.

---

### Task 1: `shopMake` options: rarity, amount, manner

**Files:**
- Modify: `src/app/11-items-shops.js` (`shopMake`, around line 151)
- Test: `test/e2e/shop.cjs` (the "rules" `p.evaluate` block)

**Interfaces:**
- Produces: `shopMake({type, size, level, seed, ed, rar?, amount?, moodIx?})`. `rar` is an array of ints 0 to 4. `amount` is `"small"|"normal"|"large"`. `moodIx` is an index into `SHOP_MOODS`. It returns today's fields `{seed, type, size, level, ed, name, label, keeper, mood, stock}` plus `moodIx` (resolved index), and `rar` and `amount` when they were given. Stock items keep their shape, and `gp` is the price after the manner.

- [ ] **Step 1: Write the failing checks** in the rules block:
  - `old`: `JSON.stringify` of `shopMake({type:"smith",size:"town",level:3,seed:"S1",ed:"2024"})` without `moodIx` equals the same call with `{amount:undefined, rar:undefined}` added. Also pin today's output by checking that `a.stock.map(x=>x.id).join()` for seed S1 equals the value captured **before** Step 3 (run once on the current code and paste it in as a literal).
  - `rarOnly`: `shopMake({type:"magic",size:"city",level:12,seed:"R1",ed:"2014",rar:[2]})`. Every magic item has `rk === 2`, and there are at least 2 of them.
  - `rarSmith`: `shopMake({type:"smith",size:"village",level:1,seed:"R2",ed:"2024",rar:[1]})` has at least 2 magic items with `rk === 1`.
  - `rarGeneral`: `shopMake({type:"general",size:"town",level:3,seed:"R3",ed:"2024",rar:[3]})` has no magic items.
  - `amount`: for `general`/`city`/seed A1, small length < normal length < large length, and small ≥ 1.
  - `mood`: `shopMake({…, moodIx:1}).mood === SHOP_MOODS[1][0]`, `.moodIx === 1`. Without `moodIx`, `.moodIx` is a valid index.
  - `moodPrice`: with `moodIx:4` (×1.25), a gear item's `gp` equals `shopNiceGp(base × 1.25)`, where base comes from `IT.data["2024"]` by id.
- [ ] **Step 2: Run** `npm run test:shop`. Expected: the new checks FAIL.
- [ ] **Step 3: Implement.** Build the `makeRng` key from today's parts, plus `"r"+rar.join(".")`, `"a"+amount` and `"m"+moodIx` only for options that are set. The magic pool filter uses `rar.includes(x.rk)` when `rar` is set, else `x.rk <= maxRk`. When `rar` is set and `S.magic` is set, `nMagic = Math.max(nMagic, 2)`. Then the cap `Math.min(nMagic, total, magicPool.length)`. `total = Math.max(1, Math.round(S.count[si] × factor))`. Manner: `moodIx` set → `SHOP_MOODS[moodIx]` with no `r.pick`; otherwise `r.pick` as today, keeping its position in the call order. Record the index.
- [ ] **Step 4: Run** `npm run test:shop`. Expected: all checks PASS, including the old ones.
- [ ] **Step 5: Commit** `git add src/app/11-items-shops.js test/e2e/shop.cjs && git commit -m "Shops: rarity, amount and manner options"`

### Task 2: Saved shops: stock, markup, own prices, restock

**Files:**
- Modify: `src/app/11-items-shops.js` (`shopNew`, `shopRender`, the `#itShop` listeners, around lines 171 to 198)
- Modify: `src/app/06-npcs-world.js` (`openshop` at line 602; `WB.shop` writes the "For sale" section with `auto: true`)
- Test: `test/e2e/shop.cjs` (replace the old page part after the rules block)

**Interfaces:**
- Consumes: `shopMake` from Task 1.
- Produces:
  - `shopEnsure(p)`: fills an old `p.shop` with `Object.assign(p.shop, shopMake(p.shop), {markup: 0})`, and only when `!p.shop.stock`. If a section titled "For sale" has text equal to `shopSaleText(p.shop)`, it's marked `auto: true` and `p.shop.sale` is set. Returns `p.shop`.
  - `shopPrice(s, x)`: the shown price (Global Constraints).
  - `shopSaleText(s)`: the same format as `WB.shop` writes today. Up to 24 items with `qty > 0`, `- ${n}: ${fmtGp(shopPrice)}${magic ? " (magic)" : ""}`, plus "…and N more". "Nothing on the shelves today." when empty.
  - `shopSave()`: `p = wp(IT.shopPlace)`. If it's missing, return. Otherwise, if the `auto` "For sale" section's text equals `p.shop.sale`, set it to `shopSaleText` and update `p.shop.sale`, then `worldSave()` and `wpSyncOut(p)`.
  - `shopOpen(p)`: `IT.shop = shopEnsure(p); IT.shopPlace = p.id`, `worldSave()`, go to `#items`, `shopRender()`.
  - `shopRestock(s)`: as in Global Constraints.
  - `WB.shop`'s draft gets `shopFull`: the whole `shopMake` result plus `markup: 0`. Task 3 stores it.
- Panel element ids:
  - `#shopMarkup` (number input)
  - `[data-shopown="<i>"]` (price input per row; a `✎` span when `own` is set)
  - `#shopRestock`
  - `[data-shopbuy="<i>"]` (kept)
  - `#shopClose` (kept)
  - `#shopWorld` ("Edit in the World": sets `W.sel = IT.shopPlace`, `W.mode = "place"`, `location.hash = "world"`)
  - The kind, settlement and level selects and `#shopReroll` are removed.

- [ ] **Step 1: Write the failing checks.** In the page, use `wpNew({name:"Old Shop", type:"shop", shop:{type:"smith",size:"town",level:3,seed:"OLD1",ed:"2024"}, sections:[{t:"For sale", x:<legacy text from shopMake for OLD1>, dm:false}]})`, then `worldSave()`.
  - `shopOpen(p)` → `p.shop.stock` ids equal `shopMake({…OLD1}).stock` ids. The "For sale" section is `auto`. `p.name === "Old Shop"`.
  - Fill `#shopMarkup` with `20` → the row 0 price input value equals `shopNiceGp(stock[0].gp*1.2)`, and `p.shop.markup === 20` after 400 ms.
  - Fill `[data-shopown="1"]` with `7` and press Tab → `stock[1].own === 7`. Then markup `50` → row 1 still shows 7 and row 0 changes. Clear row 1 → `own` is gone.
  - Bad input: markup `9999` → 500. `-500` → −90. `abc` → 0. Own `-3` → `own` is cleared.
  - Buy row 0 → the coins drop by the shown price (with markup), and `qty` drops. `page.reload()`, wait 700 ms → `wp(id).shop.stock[0].qty` is still lower.
  - The "For sale" section's text now has the marked-up price. When the section text was hand-edited first (set `sections[0].x = "mine"`), a buy leaves it as "mine".
  - Restock (accept the confirm) → `seed` changes. `name`, `keeper`, `moodIx` and `markup` stay. An item `id` that is still in stock keeps its `own`.
  - Delete the place while the shop is open, then buy → no page error.
  - The no-page-errors check stays last.
- [ ] **Step 2: Run** `npm run test:shop`. Expected: the new checks FAIL.
- [ ] **Step 3: Implement** the functions and panel above. Buy calls `itBuy({...x, gp: shopPrice(s, x)})` and keeps the "only if the coins changed" rule. Markup `input` updates the row price inputs in place, without rebuilding the panel, and saves after 300 ms. Own price saves on `change`. `openshop` calls `shopOpen(p)`. `shopNew` is deleted.
- [ ] **Step 4: Run** `npm run test:shop` and `npm run test:world`. Expected: PASS. The world check "Open the shop shows its stock" still holds, because `IT.shop === wp(id).shop`.
- [ ] **Step 5: Commit** `git add -A src test && git commit -m "Shops: saved stock, markup, own prices and restock"`

### Task 3: Shop options in the World builder, and the Items button

**Files:**
- Modify: `src/app/06-npcs-world.js` (`WB.shop`, `WB_DEFAULTS.shop`, the `shop` entry of `wbHTML`, the builder change handler around line 639, `wbCommit`)
- Modify: `src/app/11-items-shops.js` (the `#itShopBtn` listener; hide it for players in `renderItems`)
- Test: `test/e2e/world.cjs` (next to the "shop from the builder" checks, around line 194), `test/e2e/shop.cjs`

**Interfaces:**
- Consumes: `shopMake` options (Task 1), `shopFull` and `shopOpen` (Task 2).
- Produces:
  - `WB_DEFAULTS.shop = {type:"", size:"town", level:"", npcs:true, rar:[], amount:"normal", moodIx:""}`. An empty `rar` means Automatic.
  - `wpSettleSize(id)`: returns `"village"|"town"|"city"|null`, from the nearest of those types in `wpPath(wp(id))`.
  - Rarity controls: `[data-wbrar="auto"]` and `[data-wbrar="0".."4"]` check boxes. Amount: `sel("amount", …)` with no "Any". Manner: `sel("moodIx", SHOP_MOODS words, "Random")`. The note `.wb-note` appears when the kind is `general`.
  - `wbCommit` stores `x.shopFull` as `p.shop`, in place of the params-only object.

- [ ] **Step 1: Write the failing checks** (world.cjs):
  - Make a Town place "Brindle" with a district inside it. `wbStart("shop")`, then set Inside to the district through `[data-wb="parent"]` → `W.build.o.size === "town"`.
  - Tick `[data-wbrar="2"]` → `o.rar` is `[2]` and Automatic is unticked. The preview's "For sale" text contains "(magic)".
  - Set the amount to large and the manner to index 1. Press Add → the new place's `p.shop.stock.length > 0`, `p.shop.amount === "large"`, `p.shop.moodIx === 1`, and `p.shop.markup === 0`. The stock ids equal the preview's (read `wbDraft().shopFull.stock` before Add).
  - Kind General store → `.wb-note` is visible.
  - shop.cjs: clicking `#itShopBtn` → `location.hash === "#world"`, `W.mode === "build"`, `W.build.kind === "shop"`.
  - With `Portal = {views:["items"]}` set before `renderItems()` → `#itShopBtn` is hidden.
- [ ] **Step 2: Run** `npm run test:world` and `npm run test:shop`. Expected: the new checks FAIL.
- [ ] **Step 3: Implement.**
  - Pass `rar` (when non-empty), `amount` and `moodIx` (when not "") to `shopMake` in `WB.shop`. Settlements calling `WB.shop` pass none.
  - On a `parent` change, when `W.build.kind` is `shop` or `temple`, set `o.size` from `wpSettleSize` if it isn't null.
  - The rarity handler keeps `o.rar` sorted. Ticking `auto` empties it.
  - The button calls `wbStart("shop")`, sets `W.mode = "build"` and `location.hash = "world"`.
- [ ] **Step 4: Run** `npm run test:world`, `npm run test:shop` and `npm run test:all`. Expected: PASS.
- [ ] **Step 5: Commit** `git add -A src test && git commit -m "Shops: made in the World builder with rarity, amount and manner"`

### Task 4: What's new and notes

**Files:**
- Modify: `src/app/18-news.js`: a new first `NEWS` entry, `id: "2026-11-17-shops"`, `go: "world"`, title "Better shops". Items in plain words: the Items button now opens the World builder; the options; markup and your own prices; sold items stay sold; Restock.
- Modify: `docs/features/dm-tools.md` (Shops), `docs/features/npcs-world.md` (World builder): new fields, functions and ids from Tasks 1 to 3.

- [ ] **Step 1:** Write the entry and notes.
- [ ] **Step 2: Run** `npm test` and `npm run test:all`. Expected: all PASS (name any that passed only on the retry).
- [ ] **Step 3: Commit** `git add -A src docs && git commit -m "Shops: What's new and notes"`
