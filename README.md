# Magkano Pamasahe — LTFRB Land Transport Fare Checker

Live at https://magkano-pamasahe.vercel.app

Mobile-first PWA that shows the official LTFRB fare for a trip on any land-based
public transport mode in the Philippines: jeepney, UV Express, city and
provincial bus, EDSA Busway, taxi and TNVS. Fares are effective
**September 28, 2026** and come from the LTFRB fare guides published at
https://ltfrb.gov.ph/fare-rates/. The data lives in
`fares/`; the published tables extracted from the PDFs live in `fixtures/`.

Pick a mode, enter a distance (or pick Busway stations), and see the regular
fare and the Student / Senior / PWD fare, plus the old fare and the increase.
Works offline after the first visit.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine + fixture + component tests (Vitest)
npm run test:e2e   # Playwright (jeep fare, Busway pick, taxi breakdown, offline reload)
npm run build      # production build in dist/ (PWA + fares/ copied alongside)
```

## How fares are computed

All arithmetic is in integer centavos (`src/engine`). The engine has no UI
dependencies and is unit-tested against **every row of every published table**.

| Method | Modes | Rule |
|---|---|---|
| `ADD_ON` | Traditional / Modern PUJ, City Aircon / Ordinary bus, Provincial Ordinary bus | base fare covers the first N km, then per-km, rounded to ₱0.25 |
| `PER_KM` | UV Express, Provincial Aircon / Deluxe / Super Deluxe / Luxury bus | rate × km, rounded to ₱0.25 |
| `METERED` | Regular / Silver / Gold taxi, Airport taxi (stepped), TNVS (per vehicle + pick-up) | flag-down + distance + time, shown to the centavo |
| `MATRIX` | EDSA Busway (Southbound 24 stations, Northbound 23 stations) | station-to-station lookup from the LTFRB matrix |

Rules that matter for matching the published tables:

- Partial kilometres are rounded **up** to the next whole km (FR-5, pending LTFRB confirmation).
- The discounted fare is computed from the discounted rate then rounded, not 80% of the rounded regular fare (e.g. Modern PUJ 1 km: ₱13.60 → ₱13.50).
- Old (pre-Sept 28, 2026) rates were derived from the "OLD FARE RATE" columns of the same guides and verified row for row.

## Fare data

One JSON file per mode in `fares/`, plus `fares/manifest.json` with the data
version. A new LTFRB circular means a data update, not a code change:

1. Put the LTFRB PDFs in a folder and run `python3 scripts/extract.py <folder>`
   (needs `pip install pdfplumber`). This rewrites the table fixtures in
   `fixtures/` and the Busway matrix in `fares/edsa-busway.json`.
2. Edit the rate fields in the other `fares/*.json` files and bump
   `manifest.json` (`version`, `effective`).
3. `npm run fares:validate && npm test` — the fixture test fails on any row
   that disagrees with the formula.
4. Deploy. Installed apps fetch `fares/manifest.json` on launch and update
   quietly, showing a "Fares updated" banner.

EDSA Busway station details (coordinates and notes shown in the route strip)
come from `sources/EDSA_Busway_stations.kmz`. After replacing that file, run
`python3 scripts/import-busway-stations.py` to refresh `stationInfo` in
`fares/edsa-busway.json`; the LTFRB matrix remains the source of station
names and fares.

## Project layout

```
fares/            fare data (shipped with the app, also served at /fares/)
fixtures/         published LTFRB tables extracted from the PDFs (test fixtures)
scripts/          extract.py (PDF → fixtures), validate-fares.mjs (CI sanity check)
src/engine/       pure fare engine + tests
src/screens/      Home, Calculator, Compare, Tables, About
src/components/   FareCard, inputs, navigation
src/i18n/         English / Filipino strings
src/lib/          preferences, hash router, data updater, share
e2e/              Playwright tests
```

## Deployment

CI (`.github/workflows/ci.yml`) lints, type-checks, validates the fare data,
runs the unit/fixture tests, enforces the 150 KB gzipped bundle budget, runs
the Playwright suite, and deploys `main` to GitHub Pages. For a project site
the build uses `BASE_PATH=/<repo>/`; any static host works with the default
`/` base.

## Open questions (need LTFRB confirmation)

See §10 of the spec: partial-km rounding, UV Express minimum fare, taxi
flag-down coverage and time-charge basis, and taxi/TNVS rounding. The app
currently rounds km up, applies no UV minimum, charges taxi time on top of
distance, and shows metered totals to the centavo.

## Disclaimer

Fares are based on LTFRB fare guides effective September 28, 2026 and are for
reference only. Actual fares may vary by route, LGU ordinance or operator. For
complaints call the LTFRB 24/7 Hotline **1342** or visit www.ltfrb.gov.ph.
This app is not affiliated with LTFRB.
