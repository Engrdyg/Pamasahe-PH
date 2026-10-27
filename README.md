# Bayad Po — LTFRB Fare Checker and NCR Route Planner

(Formerly "Magkano Pamasahe".)

Live at https://bayad-po.vercel.app (formerly magkano-pamasahe.vercel.app)

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
| `MATRIX` (`kind: ticket`) | LRT-1, LRT-2, MRT-3 | symmetric station-to-station fares per ticket type (Single Journey, Beep). MRT-3 and LRT-2: 50% discounted fares effective March 23, 2026 (DOTr MRT-3, LRTA). LRT-1: LRMC matrix effective April 2, 2025. All transcribed with consistency checks in `scripts/import-rail.py` |

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

## Trip planner (route mode)

Distance-based and metered calculators have a trip planner: type a departure
and an arrival (place suggestions from Photon, the OpenStreetMap geocoder),
use the phone's location, or tap two pins on the map. The road distance and
time come from the public OSRM demo server over OpenStreetMap tiles (Leaflet,
loaded lazily so the main bundle stays small) and are applied to the fare as
soon as a route is found. The result is an estimate: jeepney and bus routes
can differ from the car route, and the map needs a connection. Both public
servers are rate-limited; for heavy use point `PHOTON_BASE` in
`src/lib/geocode.ts` and `OSRM_BASE` in `src/lib/routing.ts` at your own
instances.

## Route planner (NCR)

`#/plan` finds jeepney, UV Express, LRT/MRT and EDSA Busway combinations
between two places, like Sakay.ph, with the official fare of every ride and
up to two transfers. `#/plan/<lat,lng>/<lat,lng>` opens it with both ends set.

- Route data (source: **LTFRB**, NCR PUJ / UV Express route shapefile): `public/routes/ncr.json`, built from that shapefile
  (WGS 84 / UTM 51N, one polyline per route with its LTFRB memorandum circular)
  by `python3 scripts/import-routes.py` (needs `pip install pyshp`; reads
  `sources/ncr-routes/All Routes.shp`). Duplicates and closed routes are dropped,
  multi-part lines are chained, polylines are simplified to 8 m.
- Search (`src/lib/planner.ts`, run in a Web Worker): every line is resampled
  every 100 m (rail and Busway use their stations); a RAPTOR-style search does
  one round per ride, sweeping boarding costs along each line and seeding the
  next round with walks of up to 300 m to other lines. Walks to the first and
  from the last stop are up to 700 m. Jeepney and UV routes are assumed to run
  both ways along the same roads; the Busway is one-way per direction. Times
  use rough average speeds and waits, without traffic.
- Fares come from the fare engine (distance along the route for PUJ/UV,
  station matrices for rail and the Busway).
- The route file is not precached; it is cached on first use of the planner.

## Ride tracker (GPS)

Next to the trip planner, "Track my ride (GPS)" records the trip like a
fitness app: start when you board, the phone's GPS accumulates distance
(fixes worse than 60 m, jitter smaller than the position error and jumps
faster than 150 km/h are ignored), time runs from the clock, and both are
applied to the fare live; end when you get off. A ride in progress is kept
in localStorage so a reload resumes it, and the screen is kept awake with
the Wake Lock API where available. GPS pauses when the browser is in the
background, so the user is told to keep the app open.

On the EDSA Busway, which is station-priced, the tracker picks stations
instead: the stop nearest the first GPS fix becomes the boarding station,
the nearest stop follows the bus as the alighting station (the fare updates
as stations pass), and ending the ride locks it. Station coordinates come
from `sources/EDSA_Busway_stations.kmz`. The same works on LRT-1, LRT-2 and
MRT-3 with approximate station coordinates kept in `scripts/import-rail.py`
(`coordsSource: "approximate"`; spacing and ordering are checked on import).
Replace them with surveyed coordinates when available.

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

Vercel Web Analytics (`@vercel/analytics`) is injected only in Vercel builds
(`VERCEL=1`), so local dev and the GitHub Pages site never load the script.
Page views are reported per hash route (`/`, `/calc/[category]`, `/compare`,
`/tables`, `/about`) from `src/components/Analytics.tsx`.

## Open questions (need LTFRB confirmation)

See §10 of the spec: partial-km rounding, UV Express minimum fare, taxi
flag-down coverage and time-charge basis, and taxi/TNVS rounding. The app
currently rounds km up, applies no UV minimum, charges taxi time on top of
distance, and shows metered totals to the centavo.

## Privacy

The in-app privacy policy (`#/privacy`, text in `src/content/privacy.ts`) describes what is stored on the device and which third-party services some features call (OSRM, Photon, OpenStreetMap tiles, Vercel hosting and Web Analytics). Update it whenever a feature changes what data leaves the device. Public URL for app stores: https://bayad-po.vercel.app/#/privacy

## Disclaimer

Fares are based on LTFRB fare guides effective September 28, 2026 and are for
reference only. Actual fares may vary by route, LGU ordinance or operator. For
complaints call the LTFRB 24/7 Hotline **1342** or visit www.ltfrb.gov.ph.
This app is not affiliated with LTFRB.
