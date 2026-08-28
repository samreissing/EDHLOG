# EDHLOG

A bare-bones static site for tracking your Commander games and stats.

## Features

Three pages with sub-tabs and filters:

- **Stats** — Overview, Colors & Brackets, Rankings (with bracket/retired filters), Trends (100-game windows)
- **Decks** — Active / Retired / All with bracket filter and sort; add new decks
- **Games** — History (filter by deck, result, year) and Log Game (form + quick W/L)

MTG mana symbol images for color identity. Data in **localStorage** with JSON export/import.

**Important:** Game data is stored **per browser and per site**. Logging games on `localhost` is separate from [the live site](https://samreissing.github.io/EDHLOG/). Use **Export JSON** before switching devices or URLs, then **Import JSON** on the new site to restore logged games.

### Recover games lost when moving to GitHub Pages

If you logged games in the dev app (`npm run dev`) but they disappeared on the live site:

1. On the **same computer/browser** where you used localhost, run `npm run dev` and open http://localhost:5173
2. Click **Export JSON** in the footer (or run `copy(localStorage.getItem('edhlog-data-v1'))` in the browser console and save the clipboard to a `.json` file)
3. On https://samreissing.github.io/EDHLOG/, click **Import JSON** and choose that file — import **merges** with the spreadsheet seed without wiping existing games

The live site only has spreadsheet games until you import. Pod details and games logged only in the app are not in the Google Sheet.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## GitHub Pages

Live site (after Pages is enabled): **https://samreissing.github.io/EDHLOG/**

Pushes to `main` run [.github/workflows/deploy.yml](.github/workflows/deploy.yml) to build and deploy automatically — same pattern as [30-cent-edh](https://github.com/samreissing/30-cent-edh).

**One-time setup** (repo owner):

1. Open [EDHLOG → Settings → Pages](https://github.com/samreissing/EDHLOG/settings/pages)
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. Re-run the latest **Deploy to GitHub Pages** workflow (or push to `main`)

Local production preview:

```bash
BASE_PATH=/EDHLOG/ npm run build
npm run preview
```

## Build

```bash
npm run build
```

Deploy the `dist/` folder, or use the GitHub Actions workflow above.

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
