# EDHLOG

A bare-bones local app for tracking your Commander games and stats.

## Features

Three pages with sub-tabs and filters:

- **Stats** — Overview, Colors & Brackets, Rankings (with bracket/retired filters), Trends (100-game windows)
- **Decks** — Active / Retired / All with bracket filter and sort; add new decks
- **Games** — History (filter by deck, result, year) and Log Game (form + quick W/L)

MTG mana symbol images for color identity. Data in **localStorage** with JSON export/import.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

Your game data stays in this browser on this computer. Use **Export JSON** to back up, and **Import JSON** to restore.

## Taking down the GitHub Pages site

If the repo still has a live Pages site, go to **Settings → Pages**:

1. Find the line **“Your site is live at …”**
2. Click the **⋮** menu on the right of that line
3. Choose **Unpublish site**

If you do not see that menu: set **Source** to **Deploy from a branch**, then set the **branch** dropdown to **None** (not in the Source dropdown — the branch picker below it), and click **Save**.

Merge [PR #36](https://github.com/samreissing/EDHLOG/pull/36) so future pushes do not redeploy the site.

## Build (optional)

```bash
npm run build
npm run preview
```

## Data

- `public/data/seed.json` — imported from your Google Sheet (923 games, 27 decks)
- To re-import from the spreadsheet:

```bash
curl -L -o /tmp/edhlog.xlsx "https://docs.google.com/spreadsheets/d/1R_rz2ix-3QphJH-GvkJHkppfOI4SS58g/export?format=xlsx"
pip install openpyxl
python scripts/import_xlsx.py /tmp/edhlog.xlsx
cp data/seed.json public/data/seed.json
```

## What's intentionally left out (for now)

- Scryfall card lookups / deck building
- User accounts / cloud sync
- Automatic spreadsheet sync
- Exact "Normalized WR" formula from the Excel sheet (uses Bayesian shrinkage as an approximation)
