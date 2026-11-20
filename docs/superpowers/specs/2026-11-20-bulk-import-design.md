# Bulk import: design

Date: 2026-11-20. The owner's request ("Add species classes and feats and the bulk import"), after the Forge declined to copy Wizards of the Coast's books into the site and offered a way for a DM to add content from books they own to their own account or campaign.

## Goals

- One window on the Homebrew tab (DM only in a campaign; anyone offline) that reads a CSV (from Excel or Google Sheets) or JSON file and adds spells, feats, species, backgrounds and subclasses as homebrew, magic items to Items → Custom and monsters to My monsters.
- A template per kind to download, with made-up example rows, so the owner (on Windows, using a spreadsheet) never writes a file by hand.
- A preview before anything is saved: what will be added, what the Forge already has (skipped), and problems.
- Entries made through the Homebrew editor's own `hbItemOf`, so they're no different from hand-made ones.
- No server change: campaign homebrew goes through the existing `PUT /homebrew/:id`, one entry at a time.

## Not included

Whole classes (the class editor exists), sheet effects (added in the editor afterwards), and fetching anything from other sites: the DM supplies the content.

Details and the column list: `docs/features/bulk-import.md`. Tests: `npm run test:bulk`.
