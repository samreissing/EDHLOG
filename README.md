# EDHLOG

A bare-bones static site for tracking your 30-cent Commander games and stats — inspired by your spreadsheet tracker.

## Features

- **Dashboard** — overall win rate, color identity stats, bracket breakdown, active/retired decks
- **Decks** — full deck list with games/wins/losses; add new decks
- **Rankings** — decks sorted by adjusted win rate (overall + per bracket)
- **By Year** — games, wins, and win rate per calendar year
- **100-Game Stats** — rolling and cumulative win rate windows
- **Game Log** — filterable history with delete
- **Log Game** — full form + quick W/L buttons for fast entry

Data is stored in **localStorage** (no server, no accounts). Export/import JSON for backups. "Reset to seed" reloads your original spreadsheet data.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build for GitHub Pages

```bash
npm run build
```

Deploy the `dist/` folder. The app uses relative paths (`base: "./"`) so it works on GitHub Pages project sites.

## Data

- `public/data/seed.json` — imported from your Google Sheet (904 games, 27 decks)
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
