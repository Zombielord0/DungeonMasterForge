# Recovered-content import (draft preview)

The build-time manifest data/recovered-content.json starts empty and fails closed. It is not a CSV-to-JSON converter or semantic certification service. Supported targets are extra spells, magic items, and fixed stat-block monsters. Classes, character options, dynamic companions, and general rules require their own future adapter. Every entry must provide kind, name, src, ed, stableId, action (replace/promote), releaseGate PASS, productionReady true, independently verified compact payload, and review evidence plus sourceVerified, mechanicsVerified, dependenciesVerified, runtimeVerified, and distributionCleared true. These are external attestations, not inferred from field presence. No recovered book payloads are included.

Replace preserves the existing slot, source, edition, name, stable recovery ID and item key. Promote requires one exact book reference and no same-source existing record. Shared untagged records require a separate edition migration. Newly exposed cross-edition spell references are browse-only; old references remain in place for compatibility. Compendium source-specific spell descriptions are labeled summaries when incomplete. Explicitly tagged monster/item entries are filtered in both loaders and the monster search index. Full app and saved-character regression testing remains required.

## First content replacement batch

17 2014 PHB named spell references now reuse full canonical SRD 5.1 payloads, via data/reference-srd-spells.json. Whitespace-normalized archived description and higher-level fingerprints and source reference metadata match the existing canonical records (Tiny Hut's 10-foot hemisphere is represented by Self plus the 10-foot-radius rule). The links show the full SRD rule, not an independently certified complete PHB printing. Existing reference positions remain stable; canonical spell search includes the names, and the source-specific linked shells cannot be selected for preparation a second time. The app's existing CC BY 4.0 credit applies. No proprietary full source text was uploaded. 37 of the 54 newly exposed 2014 spell references remain unfilled. The separate approval manifest remains empty.

## Second SRD link batch
The final Artificer working checkpoint (3,905 compendium and 2,188 monster rows) was recovered and checksum-verified outside the public repository. All its records remain blocked for release; no private payloads are committed. Comparing 319 archived SRD 5.1 spell texts and higher-level sections against the canonical catalog yielded 311 whitespace-normalized fingerprint matches and eight differences. A further 265 exact-name 2014 PHB references with matching metadata and archived text fingerprints now display the full existing SRD spell rules. Together with the 17 earlier aliases, there are 282 links. These links are not certifications of the original book printings. Existing playable catalog arrays are unchanged by this batch.

## Original archive reconciliation
The earlier eight mismatches were pilot paraphrases, not missing canonical mechanics. The full original archive matches all 319 canonical descriptions, higher-level sections and material strings by normalized aggregate fingerprint. The 33 additional same-name PHB references (8 pilot discrepancies and 25 metadata discrepancies) now link to canonical full SRD rules, for 315 total. Four 2014 metadata fields were corrected against official SRD 5.1 pages 162, 163, 169 and 175: Mass Cure Wounds/Mass Heal evocation, Revivify necromancy, and Plant Growth's two casting-time options. Other metadata differences are explicit representation equivalences (self geometry, singular mile, special range, 24 hours). No revised-edition spell, playable position, or proprietary recovered payload is changed. Later PHB text errata and source-specific mechanical certification remain open.

## Legacy magic-item archive reconciliation
The 362 archived SRD item records comprise 341 concrete entries and 21 generic variant families. All 341 concrete 2014 canonical names, type headers and descriptions match by normalized aggregate fingerprint f5d0ded4 before corrections. All 359 existing book-reference links resolve to those canonical payloads. Official SRD 5.1 pp.244–245 correct Staff of Swarming Insects (rare) and Staff of the Python (uncommon), including rarity rank and type header. SRD p.234 confirms all four healing potion variants; the generic Potions of Healing reference now displays each one rather than only common healing. All links retain source/edition attribution; sourcebook equivalence is explicitly not certified. No new item duplicates or revised changes. The build verifies the archived raw catalog before applying the corrections.

## Conditional expanded spell lists
Optional `backgroundLists: [{name,src}]` on reviewed compact spell payloads permits an empty ordinary class list only when an explicit source-backed condition is provided. Character eligibility requires the selected official background, matching edition and a spellcasting class able to learn/prepare that level. This expands choices, does not automatically prepare a spell, and does not publish any recovered payloads. Pending homebrew and reference-only guards remain in force. The actual source backgrounds and approved spells are not included in this patch.

## Legacy background migration boundary
Approved 2014 background payloads can be promoted or replaced in extra-options with stable identity, complete feature, proficiencies, gear, money, and declared choice records. The build rejects missing, ambiguous, wrong-level, summary-only or wrong-edition spell dependencies. Approved background list extensions can reference canonical spells by exact name/source/level without duplicating spell data. The legacy background detail displays choice contracts, gear and proficiencies; interactive choice resolution and full character persistence still require separate review. No recovered backgrounds or proprietary payloads are approved or published by this patch.

## Background selections
Optional `choice.selection` carries `effect` (language, tool, detail), `count` and finite string `options`. The sheet stores validated values in existing character choices under a source/edition/recovery-ID namespace and lists outstanding selections in readiness. Selected proficiencies are derived in the proficiency section. Inventory grants, unrestricted language/setting choices and Dimir cover-guild inheritance are not automated by this adapter. No recovered payloads are published.

## Open language choices and deferred equipment
A reviewed background may declare open language choices (`open:true`, language effect only) and finite equipment choices with an exact value-to-item mapping. `deferStartingEquipment:true` defers the background kit and money for newly forged characters until the selections are complete and the player explicitly claims the kit. The source-bound entitlement is single-use; imports and old characters require manual reconciliation, and equipment choices lock after claim. The adapter does not yet implement cover-guild inheritance or platinum-denominated starting currency. No private recovery payloads are published.

## Equipment recovery
Equipment table corrections were verified against 2014 PHB pp.150,154,155 and SRD 5.2.1 pp.91–96,100–101. Existing gear IDs retain their positions; added variants and revised mounts/vehicles are appended. Ammunition purchase amounts and weights are recorded per lot; new inventory grants store individual units and per-unit weights. Old ambiguous ammunition quantities are not silently converted. Reviewed legacy backgrounds support exact starting coin denominations and nonrecursive cover-guild equipment inheritance, never inherited proficiency or spell lists. No private recovered background or magic-item payloads were published.

Container capacities and pack contents follow their respective SRD editions. Legacy pack weights are calculated from the listed contents; revised pack weights use the printed values. Shop grants consult current pack size even for an older stock snapshot. Existing ambiguous inventory quantities are left for explicit review.

## Revised SRD magic item variants
SRD 5.2.1 tables normalize 51 placeholder-containing variants and five parent descriptions in their exact 2024 catalog slots. Original DMG source labels are retained; this is an open-rules replacement rather than verification of a separate printing. Gear aliases map equivalent standard items; unique source-specific equipment retains weight/value review notes. No private source content published.

## Existing core spells and explicit dependencies
Approved `catalog: core-spells` replacements preserve the edition, source, printed page, slot and existing aliases. Core-spell and core-item replacements stay separate from supplemental arrays. A manifest may declare exact same-edition `dependencies` entries of kind Spell (with level), Item or Monster; the build rejects missing, ambiguous, incomplete or mismatched targets after catalog assembly. These checks do not replace independent mechanics review or certify undeclared dependencies, shared-rule contracts or distribution rights. No private candidates are included in the public manifest.


## SRD wand resource activation and item-detail regression repair
Nine canonical SRD wand types in each edition now expose explicit charge-only contracts after raw archive checks, with unchanged array slots. Revised sources: SRD 5.2.1 PDF pp. 250–251; legacy contracts use the previously reconciled SRD 5.1 catalog. Revised Fireball, Lightning Bolt and Magic Missile charge expenditure is capped at three per cast; legacy versions allow up to seven. Revised Web uses DC 13, legacy DC 15. Six-sided recharge and last-charge destruction are supported. Inventory details use multi-element selectors for action buttons and reopen after confirmation, including cancellation. Effects, casting prerequisites, dawn-event verification and targeting remain manually adjudicated, not automatic. Full browser CI is required. Private supplemental source payloads remain excluded; the recovery manifest is not approved by this change.


### Item regression follow-up

The 94eb508 CI run passed 51 of 53 suites. The item-detail handlers must use the multi-element selector (`$$`) for action lists and for locating a replacement detail button after rendering. The exact emitted-asset assertion now also applies the documented SRD wand charge transformation before comparing output, preserving the strict equality check. The private variant recovery checkpoint is not a distribution approval: 16 supplemental variants have candidate mechanics, 192 private standard item candidates and 33 separate Warcraft candidates remain subject to independent review. No private book payload is included in the preview by this patch.


## All-category coverage reconciliation

The generated coverage report now includes an emitted-catalog inventory by kind and edition, including equipment, character options, duplicate normalized identities and nested feature placeholders. Explicit reference/summary/pending/shadow flags are not counted as playable source candidates. A candidate count is not a release approval; hardcoded classes and options, manual effects and browser behavior remain outside this report. Private master reconciliation and supplied source evidence remain outside this public branch.


## Revised SRD character origin mechanics review

Source: System Reference Document 5.2.1, Wizards of the Coast LLC, https://www.dndbeyond.com/srd, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Reviewed pages 28–30, 83–84 and 87. The four SRD background ability, feat, skill and gold contracts are asserted in browser regression. Revised Elf Keen Senses has an explicit restricted choice in the custom builder; selected skill is carried into generation without granting all three. Existing legacy Elf proficiency is unchanged. Revised level-20 rage display is finite; revised Monk resource naming uses Focus. Origin feat rules for Alert, Magic Initiate, Savage Attacker and Skilled include missing timing, choices and repetition requirements. These descriptions do not certify every runtime effect. The Bonestorm manual-resolution assertion now tests the explicit no-automatic-damage contract rather than an obsolete warning. This is a targeted SRD batch, not a full all-category release certification.


## Revised rules glossary integration

The 155 definitions in the official SRD 5.2.1 Rules Glossary (pages 176–191) are now included in the revised Compendium's Other rules category. The archive was checked for unique source IDs, names, source/page ranges and line-text equivalence. The definitions retain the PDF reading order and all extracted table cells; this is a searchable rules reference, not automated rule enforcement or a certification of the remaining sourcebooks. Source: Wizards of the Coast LLC, System Reference Document 5.2.1, https://www.dndbeyond.com/srd, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/legalcode). Existing 2014 reference records are unchanged. The browser test checks both edition separation and actual Exhaustion text. No private source payload was published.


## Core class progression and spell resource batch

Reviewed revised SRD 5.2.1 pages 28–35, 49–52 and 61–63. Revised Bard expertise arrives at 2 and 9, Countercharm at 7 and Superior Inspiration at 18; revised Rogue Reliable Talent arrives at 7, with a proficiency-limited d20 floor in the skill roller (tool checks remain manual). Barbarian capstone recalculation applies +4 Strength/Constitution, cap 24 in legacy or 25 in revised; revised Monk Body and Mind applies +4 Dexterity/Wisdom, cap 25. Capstones are recomputed from build inputs, not repeatedly added to saved final scores. Existing characters receive progression changes on rebuild rather than an unreviewed blanket score migration. Revised Words of Creation grants both Power Word spells with class-feature attribution; second-target resolution remains manual. Revised Elf skill identity is preserved through rebuild. The Warcraft Eye Beam regression now expects manual resolution, consistent with the recurring-cone source and prior safety contract. These are specific mechanical fixes, not blanket completion approval. Source: Wizards of the Coast LLC, SRD 5.2.1, https://www.dndbeyond.com/srd, CC BY 4.0.


## Revised Draconic Spirit dependency

The official SRD 5.2.1 p. 166 was compared to the previously flattened inline spell stat block. The revised canonical Summon Dragon now shows a dedicated Draconic Spirit card with all six scores and saving throws, movement, senses, resistances, condition immunities, shared resistance, caster-based attacks and saves, and both Rend and Breath Weapon. AC, HP, Rend damage and attack count scale from slots 5–9; Breath Weapon is used once in Multiattack and its damage stays 2d6. The original archival spell text is unchanged. A structured view replaces the malformed inline table, and the cast preview points to the creature rather than suggesting immediate spell damage. No automatic encounter insertion or targeting is claimed. Other non-SRD summon stat cards still require individual primary-source validation. Source: Wizards of the Coast LLC, SRD 5.2.1, p. 166, https://www.dndbeyond.com/srd, CC BY 4.0.


## Revised martial class progression batch

Reviewed the official SRD 5.2.1 Fighter, Paladin and Ranger sections, pp. 47–48 and 53–60 (CC BY 4.0, Wizards of the Coast LLC, https://www.dndbeyond.com/srd). Revised Fighter grants Persuasion as a starting skill option and shows tactical feature acquisition levels; Action Surge explicitly excludes the Magic action. Revised Paladin has its actual feature schedule, uses the Divine Smite spell rather than the legacy direct activation, and adds Radiant Strikes to eligible inventory attacks. Revised Ranger gains its proper Expertise schedule, Roving movement, tracked Tireless and Nature’s Veil resources, short-rest exhaustion recovery through the sheet, and damage-based Hunter’s Mark concentration protection. Tactical conditional effects, mastery selection, language choices, Restoration conditions, and targeting/duration enforcement remain manual. No blanket certification or migration of manually edited sheets is implied. Tests assert edition boundaries, resources, progression, and concentration protection.


## Revised spellcasting class progression batch

Source-reviewed against SRD 5.2.1 Cleric, Druid, Sorcerer, Warlock and Wizard sections (Wizards of the Coast LLC, https://www.dndbeyond.com/srd, CC BY 4.0). Added revised feature schedules, Divine/Primal Order selections with conditional armor/weapon training, skill bonuses and extra cantrip grants; Blessed Strikes and Elemental Fury selection controls; Innate Sorcery resource toggle with spell-specific DC and attack advantage; optional short-rest Sorcerous Restoration; revised Metamagic selection counts; Magical Cunning recovery and Contact Patron grant. Legacy schedules remain separate. Conditional Blessed Strikes/Elemental Fury damage, Scholar expertise selection, Wild Resurgence, Divine Intervention, Sorcery Incarnate fallback and Arcane Apotheosis cost tracking still require manual resolution or further implementation. No blanket certification. Regression assertions cover grant removal, resource boundaries and edition separation.


## Remaining core class schedules and resource workflows

Revised Barbarian and Monk schedules now use the SRD 5.2.1 feature names, with expanded descriptions. Added Focus recovery, free Focus actions, Superior Defense, Persistent Rage recovery, Wild Resurgence (recovering expended slots only), Sorcery Incarnate, both-edition Monk saving throw proficiency, Rogue mental save proficiency, Rage casting guard, revised Danger Sense and revised Monk draft damage. Conditional initiative/turn timing is player-adjudicated. Creating slots above normal capacity, all skill selections, spellbook restrictions and subclass automation remain incomplete. Source: Wizards of the Coast LLC, System Reference Document 5.2.1, https://www.dndbeyond.com/srd, CC BY 4.0.


## Class choice and limited casting contracts

Added source/edition-guarded Primal Knowledge and Scholar proficiency choices, derived skill grants that are removed with the choice and excluded from ordinary skill retention, and Mystic Arcanum selections at Warlock levels 11/13/15/17 for both editions. Each selected complete spell gets a separate long-rest use, not an ordinary spell slot. Added revised Divine Intervention selection and resource tracking for eligible level 1–5 Cleric spells; spell effects are manually resolved. Greater Divine Intervention Wish cooldown, full spellbook restrictions, all targeting and action economy enforcement, and supplemental class mechanical certification remain outstanding. The existing 2014 and 2024 Artificer source variants are retained; this change does not independently certify their features. Source: SRD 5.2.1, Wizards of the Coast LLC, https://www.dndbeyond.com/srd, CC BY 4.0.


## Class matrix and remaining Cleric/Druid resources

Added a browser validation matrix for all 12 core classes plus Artificer, every level 1–20, both editions (520 builds). It checks class/edition identity, feature acquisition, proficiency, ability scores and HP. It is a structural progression regression, not a source-by-source proof of every feature. Added Wild Companion resource selection and long-rest expiry (familiar placement manual), and Greater Divine Intervention Wish eligibility and 2d4-long-rest cooldown. Actual spell effects remain manual. The 520-build regression is added, not reported as passed before CI concludes.


## Weapon mastery and invocation prerequisite batch

Added per-owning-class mastery selections, using the revised equipment catalog's existing mastery properties. Class level, edition, proficiency and Barbarian melee restrictions are checked; selected mastery is shown on inventory attack rows, and Tactical Master alternatives are identified for level 9+ Fighters. Target effects and rest timing remain manual. Corrected existing revised Warlock invocation level minima and pact dependency chains; legacy-only entries do not appear in the revised selection. Ineligible saved choices remain removable, and invalid choice submissions are rejected. Cantrip-specific repeatable invocation choices and full invocation catalog/mechanical implementation remain outstanding. Source: SRD 5.2.1 and D&D Beyond 2024 Basic Rules, https://www.dndbeyond.com/sources/dnd/br-2024/character-classes. CC BY 4.0 SRD attribution retained.
