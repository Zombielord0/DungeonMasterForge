# Dungeon Master's Forge — ChatGPT Work Handoff

**Prepared:** 2026-11-20  
**Repository:** https://github.com/Zombielord0/DungeonMasterForge  
**Live site:** https://dungeonmasterforge.netlify.app  
**Purpose:** Transfer the goals, discoveries, decisions, and next steps from a ChatGPT planning conversation into a new ChatGPT Work project.

> **Read this first.** This document records *intent and preliminary findings*, not a completed code audit. Verify all implementation details directly in the current repository before making changes. Do not treat proposed integrations or prior chat-generated starter code as installed functionality.

## 1. Project vision

Expand an existing **private Dungeons & Dragons campaign-management website** into a robust, searchable, dual-edition content platform supporting **D&D fifth edition 2014 and revised 2024 rules**. Preserve and improve the existing website rather than rebuilding it.

Requested content categories:
- Official **SRD** content for both editions
- Additional monsters, spells, equipment, classes, feats, and related rules
- Legally usable third-party material
- Original homebrew material
- Reference access to official books within applicable permissions
- Maps, tokens, artwork, and other campaign assets

Potential outcomes include searchable reference libraries, character management, encounters, campaign planning, homebrew editing, map/token management, and optional future AI features.

**Primary constraint:** Private campaign tool. Nevertheless, licensing, service terms, authenticated sharing, and protection of copyrighted materials still matter.

## 2. Confirmed repository and stack

GitHub repository found via connected GitHub integration:
- Repository: `Zombielord0/DungeonMasterForge`
- Default branch: `main`
- Visibility at inspection: public
- Root `package.json` and `README.md` were read directly from the repository.

**Important correction:** An earlier conversation assumed the site was **Next.js / React**. Repository inspection showed that assumption was **incorrect**. **Do not install the prior Next.js/Prisma starter module as-is or migrate frameworks without a separate, justified decision.**

Observed stack (from root `package.json` and `README.md`):
- Frontend: HTML/CSS and modular client-side JavaScript
- Bundler/build: esbuild with `tools/build.mjs`
- Hosting: Netlify
- Backend: Netlify Functions (`netlify/functions/api.mjs` and `netlify/lib/`)
- Database: Netlify Database / PostgreSQL; migrations in `netlify/database/migrations/`
- Identity: `@netlify/identity`
- Tests: Node tests plus extensive end-to-end scripts under `test/e2e/`
- Existing built-in data: `data/` (spells, monsters, items)

README describes:
- DM and player portals, campaign codes, character sheets, party features, and whispers
- Homebrew subclasses, backgrounds, feats, species, spells, monsters, and items (verify exact implementations)
- Campaign tracking, encounters, world/NPC tools
- Dungeon maps, imported images, `.dd2vtt` import/export, fog of war, TV/player views, tokens
- Offline/local save and account sync behavior

These descriptions are not a substitute for testing current behavior.

## 3. Key architecture decision

**Extend the existing application and data model first.** Keep Netlify Functions, the current frontend approach, and PostgreSQL unless the audit proves a compelling reason to change. Preserve existing users, campaigns, homebrew, offline functionality, maps, and player access.

Build the content system as a discrete, testable module:
1. **Source manifest:** source ID, title, publisher, version, URL, content license, attribution text, permitted use, import date, checksum.
2. **Normalized content records:** stable identifier, type (spell/monster/item/etc.), display name, edition (2014 or 2024), source ID, source-specific identifier, record version, JSON payload, searchable fields.
3. **Edition-aware linking:** related 2014/2024 entries linked by concept without overwriting one another.
4. **Homebrew separation:** user/campaign-owned records and custom overrides never overwritten by official dataset refreshes.
5. **Search:** name, edition, content type, filters, source, paging; index suitably for PostgreSQL.
6. **Importer:** validated, idempotent imports with dry-run, upserts, logging, provenance tracking, error recovery, and no destructive changes.
7. **Attribution:** visible source/license information on entries and appropriate repository/app notices.

Reconcile this design against **existing** tables, APIs, data formats, caching, offline storage, and auth before coding.

## 4. Candidate content sources

Verify availability, coverage, exact current versions, API terms, content licensing, and compatibility before relying on any source.

### Official open content
- Wizards of the Coast SRD downloads: https://www.dndbeyond.com/srd
- SRD 5.1 for original fifth-edition material; revised SRD 5.2.x for 2024-era rules.
- The **SRD** is not the same as the complete 2014 or 2024 Player's Handbook, Dungeon Master's Guide, or Monster Manual.
- The SRD content is available under **CC BY 4.0**; comply with applicable attribution and change notices.

### Structured APIs / repositories
- 5e-bits API/code: https://github.com/5e-bits/5e-srd-api
- D&D 5e API: https://www.dnd5eapi.co/
- API documentation: https://docs.dnd5eapi.co/
- Open5e API project: https://github.com/open5e/open5e-api
- Open5e: https://open5e.com/

**Caution:** A repository's software license does not necessarily grant permission to republish every item in its dataset. Verify license **per content source** and API usage terms. Confirm whether each candidate supplies both editions and which resource types are actually available. Favor local imports of permitted datasets over requiring live third-party API calls during play.

### Artwork, maps, and tokens
- Forgotten Adventures: https://www.forgotten-adventures.net/
- 2-Minute Tabletop: https://2minutetabletop.com/
- Token Stamp: https://rolladvantage.com/tokenstamp/

These are **candidates, not blanket asset redistribution grants**. Check the terms of each pack and distinguish private tabletop usage from bundling assets into a website or repository. Keep asset metadata (creator, source, license, attribution, visibility).

### Official books and private reference material
Buying a digital book or PDF does **not** inherently authorize extracting and republishing all its contents inside an app. Where rights are unclear, use personal reference links/viewers and licensed imports, not automated bulk scraping of official copyrighted texts. Do not commit paid books, scans, or proprietary assets to this **public** GitHub repository.

## 5. Conversation history and decisions

1. User originally requested downloadable PDF references for D&D 5e 2014 and 2024.
2. Intent clarified: building a D&D website and adding substantial content, not simply collecting PDFs.
3. User chose both editions and all content categories listed in section 1, with the intended use being a **private campaign tool**.
4. A preliminary plan proposed Next.js + Prisma + PostgreSQL and a standalone starter module. **This was based on the user's tentative stack description, before the actual repository was examined. Do not assume it belongs in this project.**
5. User considered migrating the development task to ChatGPT Work to benefit from longer multi-step project execution.
6. GitHub connection located `Zombielord0/DungeonMasterForge`; inspection of `package.json` and `README.md` revealed the current Netlify + JavaScript architecture.
7. The resulting recommendation: **audit the actual project first, avoid an unnecessary rewrite, then add a dual-edition content layer incrementally**.

## 6. ChatGPT Work: first assignment

Act as senior full-stack engineer, architect, and technical project manager.

**Phase A — Read-only audit (do first)**
- Inspect the complete repository layout and dependencies; identify build/deploy procedures.
- Inspect `data/`, build scripts, front-end modules, Netlify functions, migrations, and identity rules.
- Determine which 2014/2024 content already exists, its sources, completeness, shape, and license/provenance.
- Trace search, character creator, spells, monsters, items, homebrew, API persistence, sync, and offline flows.
- Identify tests that exercise these features and any known gaps or failures.
- Review security, access controls, data integrity, performance, and possible copyrighted content exposure.
- Report precisely what has been *verified* versus what is *proposed*. No changes during audit.

**Phase B — Design**
- Propose minimal schema/API extensions to the existing PostgreSQL/Netlify stack.
- Define a safe 2014 + 2024 data migration and ingestion plan that does not break existing campaigns or character sheets.
- Map source licenses and attribution requirements by dataset.
- Prioritize a first deliverable: **dual-edition spell and monster library with search and attribution**, reusing existing UI/features where possible.
- Include an explicit test plan and rollback strategy.

**Phase C — Implement only after reviewing the plan**
- Work on a separate feature branch and propose pull requests; do not push unreviewed changes to `main`.
- Back up relevant data or define safe backup/recovery steps before migrations.
- Preserve all existing functionality and design conventions.
- Add small, testable changes with appropriate unit and e2e tests.
- Verify actual builds/tests; never claim an unexecuted check passed.

## 7. Initial acceptance criteria

- 2014 and 2024 content can be filtered and distinguished reliably.
- Monster and spell results include source and license attribution.
- Imports are idempotent, logged, and safe to rerun.
- Campaign homebrew remains intact when source data refreshes.
- Existing player/DM flows, character sheets, map tools, sync, and offline play remain functional.
- No proprietary book text/art is committed without the necessary rights.
- A clean install/build and relevant automated tests succeed, with any exceptions documented.
- Deployment and migration steps are written for the current Netlify setup.

## 8. Handoff prompt for the new Work conversation

> Inspect the GitHub repository **Zombielord0/DungeonMasterForge**, starting with **WORK_HANDOFF_README.md** and the existing **README.md**. First conduct a **read-only technical audit** of the current application, data formats, migrations, API, identity, tests, and current D&D rules content. The actual stack is **HTML/CSS/JavaScript + esbuild + Netlify Functions + Netlify Database/PostgreSQL + Netlify Identity**, **not Next.js**. Recommend a minimally invasive plan to add licensed, attributed, searchable **2014 and 2024 SRD** content, with safe imports and homebrew preservation. Do not change files or push code until the audit and implementation plan are reviewed.

## 9. Safety and workflow notes

- This handoff file is documentation only; it does not install a module or alter runtime code.
- Never add credentials, secrets, production database exports, paid PDFs, or private player information to the repository.
- Inspect current repository state before each change because project details may have evolved after this handoff.
- Keep the original `README.md` as the application's operational documentation; update it later only if implementation changes warrant it.
