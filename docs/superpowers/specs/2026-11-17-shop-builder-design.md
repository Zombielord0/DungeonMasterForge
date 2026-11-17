# Shops in the World builder: design

Date: 2026-11-17. Agreed with the owner in chat.

## Why

Making a shop isn't intuitive right now. **🏪 Generate a shop** on the Items tab shows a random shop at once, with only three settings (kind, settlement, party level), and the shop is thrown away when it's closed. The World builder already has a Shop kind, with a name, a place and a campaign, but its options are thin too, and a saved shop forgets what was sold.

The owner sets up shops before sessions and makes them during play. They want one place to make a shop, with real choices up front, that becomes part of the World.

## Goals

1. **One shop maker, in the World builder.** The Items tab's 🏪 Generate a shop button opens the World tab with the builder on Shop.
2. **More options when making a shop:** rarity, how much stock, the shopkeeper's manner, alongside name, kind, where it is, campaign, settlement size, party level and "add the shopkeeper as an NPC".
3. **A saved shop remembers its stock:** what's sold stays sold, after closing or reloading.
4. **Change prices after the shop is made:** a markup for the whole shop, and your own price on any single item.
5. **Restock** a saved shop.

## Non-goals

- Adding or removing single items from the stock by hand.
- Players seeing or buying from shops on their phones.
- Throwaway shops that are never saved. (A shop can be deleted from the World like any place.)

## Anti-goals (a failure even if it works)

- Shops already saved in someone's World change their stock. An existing `p.shop` must still give the same stock the first time it's opened after the update.
- The Items tab button still makes a shop the old way, leaving two shop makers.
- A markup change wipes out prices the DM typed by hand.

## Approaches considered

- **A. One shop maker in the World builder (picked).** The Items tab button becomes a shortcut to it. One set of options, every shop is a World place, saved with the World (backups, account). Trade-off: no quick unsaved shop.
- **B. Keep both**, with the same options on the Items tab and a "Save to World" button. Rejected: two makers with the same options to keep in step is what feels confusing today.

## The design

### 1. Making a shop (World tab → 🛠 World builder → 🛒 Shop)

- **The Items tab button** (`#itShopBtn`) goes to `#world`, sets `W.mode = "build"` and starts the builder on `shop` (`wbStart("shop")`). The place currently selected in the World tab, if any, is the default "Inside", as the builder already does.
- **The Shop options** (`WB_DEFAULTS.shop`, the `shop` entry in `wbHTML`):
  - Name (exists), Inside and Add to campaign (exist, shared by every kind).
  - Kind of shop (exists).
  - **Settlement size.** When "Inside" changes, it's filled in from the nearest place up the path (`wpPath`) whose type is village, town or city. If none is found, it keeps its current value. The DM can still change it by hand (builder's call).
  - Party level (exists).
  - **Rarities stocked:** tick boxes Common, Uncommon, Rare, Very rare, Legendary, plus **Automatic** (the default, today's rule from settlement size and party level). Ticking any rarity turns Automatic off; unticking them all turns it back on. Kinds of shop with no magic stock (General store) show a short hint that rarity doesn't apply.
  - **How much stock:** Small, Normal, Large. These are about ×0.5, ×1 and ×1.5 of today's counts (`S.count`), at least 1 item each.
  - **Shopkeeper's manner:** Random (default), or one of `SHOP_MOODS` by its words ("fair and friendly", …). It sets the price factor as today.
  - Add the shopkeeper as an NPC (exists).
- The preview below updates on every change, as the builder does now. 🎲 Roll again and ✓ Add to World work as now.

### 2. `shopMake` gets new options

`shopMake({type, size, level, seed, ed, rar, amount, mood})`:

- `rar`: an array of rarity ranks (0 to 4), or missing for Automatic. With it, the magic pool is items whose `rk` is in the list, instead of `0..maxRk`.
- `amount`: `"small" | "normal" | "large"`, missing = normal. It scales the total count (`S.count`); the magic count is then capped by the new total, as today (builder's call).
- `mood`: an index into `SHOP_MOODS`, missing = random.
- **Edition:** the builder uses the Items tab's edition (`IT.ed`) as today, and a saved shop keeps the edition it was made with.
- **Same seed, same shop, still.** When all three are missing, the random number calls happen in exactly the same order as today, so old saved shops and the existing `test:shop` checks keep their stock. The new options are added to the `makeRng` key only when they're set.

### 3. A saved shop keeps its own stock

Today `p.shop = {type, size, level, seed, ed}` and the stock is rebuilt each time. It becomes:

```
p.shop = { type, size, level, seed, ed, rar?, amount?, mood?,   // how it was made
           keeper, moodText, label,                             // shown on the shop
           stock: [ {id, n, cat, g, kind, rk, r, att, w, gp, qty, own?} ],  // gp = price before markup
           markup: 0 }                                          // percent, e.g. 20 or -10
```

- `wbCommit` stores the stock it previewed, so the shop the DM saw is the shop they get.
- **Older shops** (no `stock`): the first time one is opened, `shopMake(p.shop)` builds the stock, keeper, manner and label (the same seed gives the same ones as when it was made) and they're saved onto the place. The place's name is never changed. Shops made inside a Settlement by the builder (`WB.settlement` calls `WB.shop`) are saved through the same `wbCommit`, so they get `stock` too.
- **The price before markup** (`gp`) is the price after the shopkeeper's manner, as `shopMake` gives it today.
- A stock item's `own` is the DM's own price in gp. When it's set, it's the price shown and charged, and the markup doesn't change it.
- **The shown price** = `own` if set, else `shopNiceGp(gp × (1 + markup / 100))`.
- Saving uses `worldSave()` (so it's in backups and the DM's account through `Cloud`). No new localStorage key.

### 4. Running a shop (World place → 🛒 Open the shop → Items tab)

- "Open the shop" opens the saved shop on the Items tab as now. `IT.shop` holds `placeId`, so every change is written back to the place.
- The panel keeps the shop name, kind, shopkeeper and manner, and loses the old kind/settlement/level selects and Roll again (those belong to the builder).
- **Markup:** a number box, "Markup %", from −90 to +500. Prices update as it's typed, and it's saved.
- **Own price:** each price is an input. Typing a price sets `own`, and a small ✎ marks it. Emptying the box clears `own`, back to the markup price.
- **Buy** works as now (coins from the character in "Give items to", only if the coins actually changed) at the shown price, and the lower count is saved.
- **🔄 Restock** asks first ("Restock? Sold-out items come back and the stock is rolled again."), then rolls new stock with the same options and a new seed. **Only the stock changes:** the shop's name, shopkeeper and manner stay as they were (the saved manner's factor is reused, so prices keep the same feel). The markup stays. Own prices stay for items that come back (builder's call).
- A link "Edit in the World" goes to the place.

### 5. The shop's World page

- The "For sale" section the builder writes is marked `auto: true`. It is rewritten only while its text still matches what was last written; if the DM has edited it by hand, it's left alone (builder's call). It's rewritten from the stock whenever the markup, an own price, a count or a restock changes, using the shown prices and leaving out sold-out items. This is what players see if the DM shares the place in the Journal, so it must never include anything but item names, prices and "(magic)", as today.
- The description line ("run by …, who is …") is left as written.

### 6. Other bits

- A **What's new** entry at the top of `NEWS`.
- Notes updated: `docs/features/dm-tools.md` (Shops) and `docs/features/npcs-world.md` (World builder).
- **Tests:**
  - `test/e2e/shop.cjs`: the existing rules checks unchanged (same seed, same shop); new `shopMake` options (rarity filter, amounts, mood); the Items button opens the builder on Shop; markup and own price in the open shop; sold counts survive a reload; restock keeps markup and own prices.
  - `test/e2e/world.cjs`: the Shop builder's settlement size follows "Inside"; Add to World saves `stock`; an old-style `p.shop` opens with the same stock as before.

## Left to the builder

- Exact layout and wording of the new options and the markup box, following the builder's existing `f()` fields, chips and check boxes.
- How the rarity tick boxes look (chips like the Items filter, or check boxes).
- Rounding of the Small and Large counts.
