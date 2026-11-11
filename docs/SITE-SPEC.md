# Bayad Po — complete site specification

> Purpose of this file: a single, self-contained description of what the
> website looks like and what it does, written for AI agents and developers
> who have not seen it. It reflects the code on `main` as of 2026-11-11.
> UI strings are quoted in English with the Filipino (FIL) version where it
> helps; every string exists in both languages (`src/i18n/en.json`, `fil.json`).

---

## 1. What the product is

**Bayad Po** ("bayad po" is what Filipino commuters say when handing over the
fare) is a free, ad-free, mobile-first **Progressive Web App** for commuters in
the Philippines. It answers two questions:

1. **"Magkano?" — How much is the official fare?** For every land transport
   mode regulated by the LTFRB (jeepney, UV Express, city and provincial bus,
   EDSA Busway, taxi, TNVS/Grab) plus the LRT-1, LRT-2 and MRT-3 trains, using
   the LTFRB fare guides effective **September 28, 2026** (rail: DOTr/LRTA/LRMC
   matrices).
2. **"Saan?" — How do I get there?** A Sakay.ph-style **route planner** for
   Metro Manila: jeepney, UV Express, rail and Busway combinations with up to
   two transfers and the official fare of each ride.

Supporting features: Student/Senior/PWD 20% discount toggle, comparison of
modes, published fare tables, a GPS **ride tracker**, a **multi-leg trip**
total, an **overcharge report** helper (LTFRB hotline 1342), a donation page
(GCash), privacy policy, offline use, installable app, light/dark theme,
English/Filipino.

- Live URL: **https://bayad-po.vercel.app** (formerly magkano-pamasahe.vercel.app)
- Repository: `Engrdyg/Pamasahe-PH` (branch `main` is production on Vercel)
- Not affiliated with LTFRB; the app says so in About and in the planner notes.

---

## 2. Technology

| Area | Choice |
|---|---|
| Framework | React 19 + TypeScript, built with Vite 7 |
| Styling | Tailwind CSS v4 with semantic colour tokens (section 4) |
| Routing | Hash router (`#/…`), `src/lib/router.ts` |
| State | React context `src/state.tsx` (fare data, discount, language, theme, trip) |
| i18n | i18next; `en` and `fil` |
| Fare engine | Pure TypeScript in `src/engine/` (integer centavos) |
| Maps | Leaflet + OpenStreetMap tiles (lazy-loaded chunk) |
| Place search | Photon (komoot), OpenStreetMap-based geocoder |
| Road routing | OSRM public demo server (calculator trip planner only) |
| 3D | three.js (Home hero jeepney), lazy-loaded chunk |
| Route planner | Own RAPTOR-style search in a Web Worker (`src/lib/planner.ts`) |
| PWA | vite-plugin-pwa / Workbox: precached app, offline fare data |
| Analytics | Vercel Web Analytics (cookieless page views) on Vercel builds only |
| Tests | Vitest (125 unit/component tests), Playwright (15 e2e tests) |

Main JS bundle ≈ 136 KB gzipped (CI budget 150 KB). Map, 3D, planner and its
route data load only when needed.

---

## 3. Navigation and URLs

All routes are hash routes, so any URL works offline from the cached shell.

| URL | Screen | Title shown in top bar (EN / FIL) | Back target |
|---|---|---|---|
| `#/` | Home | App name "Bayad Po" + effective-date badge | — |
| `#/plan` | Route planner | "Route planner" / "Ruta at pamasahe" | Home |
| `#/plan/<lat,lng>/<lat,lng>` | Route planner with both ends set | same | Home |
| `#/calc/<category>` | Fare calculator for a category | category name | Home |
| `#/compare` | Compare modes | "Compare modes" / "Ikumpara…" | — (nav item) |
| `#/tables` | Fare tables | "Fare tables" / "Talaan ng pamasahe" | — (nav item) |
| `#/trip` | My trip (multi-leg total) | "My trip" / "Biyahe ko" | Home |
| `#/support` | Donate | "Support this app" / "Suportahan ang app" | — (nav item) |
| `#/about` | About & report | "About & report" / "Tungkol & pag-uulat" | — (nav item) |
| `#/privacy` | Privacy policy | "Privacy policy" | About |

Categories for `#/calc/<category>`: `jeepney`, `uv`, `bus-city`,
`bus-provincial`, `busway`, `rail`, `taxi`, `tnvs`.

### Phone layout (< 768 px)

- **Top bar** (sticky, white/translucent, bottom border): back chevron `‹`
  (when the screen has a back target) or the logo; the screen title (on Home
  the app name plus a small pill "● Effective Sep 28, 2026 · LTFRB" / "Simula
  Set 28, 2026 · LTFRB"); a round **theme** button (☀ light / ☾ dark / ◐ system,
  cycles) and a round **language** button showing the other language ("EN" /
  "FIL").
- **Bottom navigation** (fixed, 5 items, icon above label):
  ⌂ Home · ⇄ Compare (Ikumpara) · ☰ Fare tables (Talaan) · ♥ Support (Suporta) ·
  ⓘ About (Tungkol). The active item is brand-blue; others grey.
- **Trip bar** (when the trip has legs): a floating yellow pill above the
  bottom nav, e.g. "Trip · 2 legs · ₱88.25" (FIL "Biyahe · 2 leg · …"); tap
  opens `#/trip`.
- **Update banner** (when newer fare data arrives): yellow strip under the top
  bar, "Fares updated — effective {date}" with "Dismiss".

### Tablet / desktop layout (≥ 768 px)

- Persistent **left sidebar** instead of top/bottom bars: logo + app name +
  effective badge; menu Home, **Routes** (Ruta, ⌖), Compare, Fare tables,
  Support, About; the discount toggle; Appearance chips (Light / Dark /
  System); Language chips (English / Filipino); "Privacy policy" link;
  "LTFRB 24/7 Hotline: 1342".
- Content column (max ≈ 1150 px) with a page title and round back button.
- Calculators use two columns (inputs left, fare card right).
- Trip bar floats bottom-right.

---

## 4. Visual design

- Brand blue `#0b3d91` (dark mode `#5b8def`), accent yellow `#ffc72c`.
- Semantic tokens (light → dark): canvas `#f8fafc`→`#0b1220`, canvas-2
  `#f1f5f9`→`#111a2e`, surface `#ffffff`→`#16213a`, ink `#0f172a`→`#e6ecf7`,
  ink-2 `#334155`→`#c3cde0`, muted `#64748b`→`#8fa0bd`, line `#e2e8f0`→`#263351`.
- Font: Inter / system UI. Large tabular figures for fares (≈ 48 px primary).
- Cards: white surface, rounded 16–24 px, thin border, soft shadow.
- Buttons: pill-shaped; primary filled brand blue, secondary outlined.
- Minimum touch target 44 px. Visible focus rings.
- Theme: Light / Dark / System (System follows the OS). Maps always use a
  light, softly desaturated basemap in both themes (dimmed slightly in dark).
- Logo: a yellow speech bubble with "₱?" (`public/logo-mark.svg`, `icon.svg`).
- Category icons: one flat icon set in `public/icons/*.svg` (navy + yellow).
- Splash/loading screen on first paint: logo, "Bayad Po", "Tamang pamasahe,
  bawat sakay", spinner, "Based on ltfrb.gov.ph/fare-rates · Effective Sept
  28, 2026"; a reload button appears if the app has not started after a few
  seconds.

---

## 5. Screens in detail

### 5.1 Home (`#/`)

1. **Hero** (full width; on desktop a rounded card with text left, 3D right):
   - Kicker "BAYAD PO! 👋", headline **"Where are you going?" / "Saan ka
     pupunta?"**, sub-line "Find the route and the right fare for every ride:
     jeep, UV, train and Busway."
   - A **search card** that opens the route planner: two fake inputs
     "● Where will you get on?" (blue dot) and "● Where will you get off?"
     (yellow dot) and a filled button **"Find a route ›" / "Hanapin ang ruta ›"**.
   - Link "Or check the fare for each vehicle ↓" that scrolls to the tiles.
   - A **3D patok jeepney** (Cubao–Antipolo style: stainless body with
     airbrushed flames, chrome mags, bull bar, horses, LED strips, antennas,
     underglow, open cab doorways and passenger cabin with benches and grab
     rails) slowly turning on a turntable; drag sideways to spin. A tilted
     yellow price tag on it: "JEEP, MINIMUM ₱14.00" (follows the discount).
     Reduced-motion users get a still frame; without WebGL only the backdrop.
2. Heading **"Fares by vehicle" / "Pamasahe kada sasakyan"**.
3. **Discount toggle** (phone): "Student / Senior / PWD (20% discount)".
4. **Category tiles** (2 columns phone, 3–4 desktop), each: icon, name, hint,
   and a bold "from" rate line:
   - EDSA Busway — "Station to station" — "From ₱18.00"
   - Train (Tren) — "LRT-1 · LRT-2 · MRT-3" — "From ₱6.00"
   - Jeepney (Jeep) — "Traditional · Modern" — "₱14.00 · first 4 km"
   - UV Express — "Traditional · Modern" — "₱2.60 per km"
   - City Bus — "Metro Manila aircon · ordinary" — "₱15.00 · first 5 km"
   - Provincial Bus — "Ordinary to Luxury" — cheapest rule
   - Taxi — "Regular · Premium · Airport" — "From ₱65.00 flag-down"
   - TNVS / Grab — "Ride-hailing base fare" — "From ₱55.00 flag-down"
5. **Install card** ("Download the app", "Download app" / "Not now") when the
   browser offers installation and it was not dismissed.

### 5.2 Route planner (`#/plan`) — Sakay.ph-style

Layout on phones (top to bottom; the header is sticky under the top bar):

- **Header row** (compact, horizontal): `[● From]  ⇄  [● To]` — two tappable
  fields (placeholders "From"/"To", FIL "Sakayan"/"Babaan"; blue and yellow
  dots) with a swap button between them.
- **Second row**: "🚍 All modes ▾" (FIL "Lahat ng mode") and "Clear"
  (Burahin). Opening it shows toggle chips **Jeep, UV Express, Train, Busway**
  in their colours; turning one off re-plans without it ("2 of 4 modes").
- **Map** (Leaflet + OSM): before results it fills the screen down to the
  bottom nav (measured); with results ≈ 55% of that. Opens on Metro Manila.
- **Results** below the map, then **Steps**, then data notes.

Desktop: header and results in a 400 px left column, map sticky on the right.

**Picking places** — tapping a field opens a **full-screen place sheet**:
back `‹` + title ("Where will you get on?"), a search box with 🔍 and ✕,
tabs **Suggestions / Saved / Recent** (Mungkahi / Naka-save / Kamakailan).
Suggestions with an empty box: "◎ Current location — Use my location" and
"📌 Pin on map ›". While typing: rail and Busway stations that match (offline,
"🚉 Ayala (MRT-3) — Station") and Photon place results ("📍 Quiapo Church —
Quezon Boulevard, Manila"). Each row has ☆/★ to save it. Picked places go to
Recent (max 10).

**Pins**:
- "Pin on map" mode: a fixed teardrop pin (A blue / B yellow) sits in the
  centre; the user moves the map under it. A dark banner says "Move the map to
  put the pin on '…'", and a bottom card shows the nearest landmark
  ("📍 Quiapo Church (Quezon Boulevard)") with **"Set as pick-up point"** /
  **"Set as drop-off point"** ("Itakda bilang sakayan/babaan") and "Cancel".
- After that, **A and B are draggable markers**; dropping one renames the
  field after the nearest landmark and re-plans without moving the map.
- Tapping the map does nothing (no accidental pins).

**Result options** (cards, up to 5, fastest first, plus "Walk" for short trips):
big fare (e.g. **₱13.00**, follows the discount toggle), "≈ 33 min", a row of
coloured ride chips ("🚆 LRT-2", "🚐 CUBAO - BUENDIA" …), and "Direct · 900 m
walk" or "2 transfers · 750 m walk". The selected option has a blue ring.

**Map for the selected option**:
- Each ride in its own colour: LRT-1 green, LRT-2 purple, MRT-3 blue, Busway
  red; road rides take orange, pink, cyan, navy, amber in order (so two jeep
  rides never share a colour). Walks are dotted grey lines.
- Markers: **▲ circle = get on**, **⇄ diamond = transfer**, **■ square = get
  off**, small white dots = stations passed (rail/Busway).
- Labels: "Get on: Recto station", "Get off: Gateway Mall (Aurora
  Boulevard)" (on phones only first and last stops are labelled).
- A collapsible **Legend** (bottom-left; collapsed on phones): numbered rides
  with colour swatch and name, walk line, and the marker shapes.

**Steps card** ("Steps" / "Mga hakbang"):
- 🚶 "Walk 550 m (about 7 min) to Recto station" / "… to the stop near Quiapo
  Church" / "… to {destination}".
- Ride rows with a coloured left border: icon, mode name and route name
  ("Traditional Jeepney: Cubao - Vito Cruz via E. Rodriguez"), "▸ Get on near
  …", "▸ Get off near …", distance or stations ("Recto → Araneta
  Center-Cubao"), "≈ 21 min", the LTFRB memorandum circular (e.g. "MC
  2020-041"), the ride's fare on the right, and the modern-jeep alternative
  fare when the route allows both.
- Total (Regular or Student/Senior/PWD) and **"+ Add all rides to trip"**.

**Notes** (shown with results): drag hint; route data credit (LTFRB NCR
jeepney and UV Express route data, 579 routes, per LTFRB memorandum circulars,
plus LRT-1, LRT-2, MRT-3, EDSA Busway); routes assumed to run both ways along
the same roads; times are estimates without traffic or waiting; landmarks from
OpenStreetMap; not affiliated with LTFRB.

### 5.3 Fare calculator (`#/calc/<category>`)

Common parts, top to bottom:
1. **Mode chips** when the category has several modes (e.g. "Traditional
   jeep" / "Modern jeep"; "Aircon (Metro Manila)" / "Ordinary (Metro Manila)";
   "Regular" / "Premium Silver" / "Premium Gold" / "Airport"; Provincial
   Ordinary … Luxury; rail "LRT-1" / "LRT-2" / "MRT-3").
2. **Fare rule banner** (yellow, 📏) in plain words, from the data:
   "₱15.00 for the first 5 km, +₱2.49 per succeeding km" (FIL "₱15.00 sa unang
   5 km, +₱2.49 bawat susunod na km"); "₱2.60 per km"; "₱65.00 flag-down,
   +₱13.50 per km, +₱2.00 per minute"; "₱115.00 for the first 500 m, +₱4.00 per
   300 m, +₱4.00 per 2 min"; "Flag-down ₱55.00 to ₱165.00 depending on the
   vehicle…"; "Minimum fare ₱18.00; depends on the stations". Uses the
   discounted rates when the discount is on (metered: "(20% off the total…)").
3. **Discount toggle** (compact).
4. Inputs (by method) and the **Fare card**.

Input variants:
- **Distance modes** (jeepney, UV, buses): "Distance (km)" number field with
  slider; buttons "📍 Search places or pin on map" (opens the trip planner:
  from/to search + map, OSRM road distance and time fill the inputs
  automatically) and "🛰️ Track my ride (GPS)".
- **Metered** (taxi, TNVS): distance (km; metres for the airport taxi, with
  conversion when switching type), "Travel time (min)", TNVS vehicle chips
  (Hatchback, Sedan, SUV, Premium) and pick-up distance; same planner and GPS
  buttons.
- **Station matrix** (Busway, rail): ticket chips for rail ("Single Journey" /
  "Beep / Stored Value"), "From station" and "To station" selects (Busway
  direction is inferred: destination must be after the origin in the
  southbound or northbound list), "Minimum fare ₱x / ₱y", the GPS tracker
  (nearest station becomes the boarding station; the alighting station
  follows the vehicle), and a **route strip** listing the stations between
  boarding and alighting with notes/coordinates.

**Fare card** (result):
- Primary fare large ("REGULAR ₱30.00" or "STUDENT / SENIOR / PWD ₱24.00"
  depending on the toggle) and the other one smaller.
- "Old fare: ₱27.50 +₱2.50 (+9.1%)" (red when up), or "No previous rate…".
- Notes: "Charged as 12 km", direction/ticket, source and effective date,
  "Beyond published table…" warning.
- Metered breakdown table: Flag-down, Distance, Time, (Pick-up), Total.
- Buttons: **"+ Add to trip"** (then "Added to trip ✓"), **"Share"** (Web
  Share API or copies text like "Traditional Jeepney, 12 km: ₱30.00 (₱24.00
  discounted) — LTFRB Sep 28, 2026"), **"⚠ Report overcharge"**.

**Report overcharge panel** (inline, red-tinted): shows the official fare;
fields "How much were you charged? (₱)", "Plate or body number", "Where /
route (optional)", "Other details (optional)"; live result "Overcharge:
₱10.00 (+33.3%)" or "That is not more than the official fare."; tip about
photos/receipts; **report preview** (vehicle, trip, date/time, plate, place,
charged, official, overcharge, notes, basis + site URL); buttons "Call LTFRB
1342" (tel: link; not shown for trains, which get a note to report to the line
operator), "Copy report", "Share report", "Close".

**Ride tracker** (GPS, Strava-like) card: "Start ride" → live "Distance" (km)
and "Time" (m:ss), "Tracking · n GPS fixes · ±x m", a small map of the path,
"End ride" (red) and "Discard". Distance and time feed the fare live. Keeps
the screen awake (Wake Lock), survives reloads, filters bad fixes (accuracy
> 60 m, jitter, > 150 km/h jumps). Messages for waiting for GPS, weak signal,
no permission, and "keep the app open".

### 5.4 Compare (`#/compare`)

"Fare for the same distance across all distance-based modes, cheapest first."
A distance input, then a list of every distance-based mode with its regular
and discounted fare for that distance, sorted cheapest first; rows past a
mode's published table say "beyond table".

### 5.5 Fare tables (`#/tables`)

Mode chips, then the published-style table for that mode: km rows with New
(regular / discounted) and Old fares, a "Find km" search box, and the note
"Generated from the LTFRB formula; matches the published guide row for row."
For station modes: pick a from-station and see fares to every other station
(per direction or ticket type). Modes without a table say so.

### 5.6 My trip (`#/trip`)

Big "TOTAL FARE · REGULAR ₱100.25", "Student / Senior / PWD: ₱80.10", note
"Each leg is paid separately; transfers between lines need a new ticket."
Numbered legs (mode, trip label, source, fare, "Remove"), buttons "+ Add
another leg", "Share trip", "Clear trip". Empty state explains how to add legs.
Stored on the device.

### 5.7 Support (`#/support`)

"Support this app": short appeal; **"Open GCash"** button (Android intent to
the GCash app, falls back to the store); the GCash QR image with "Save QR";
masked recipient "JA**E J* D." and "+63 967 348 ••••" (the full number is
never shown); "Transfer fees may apply."

### 5.8 About (`#/about`)

Cards: **Report an overcharge** (LTFRB 24/7 Hotline 1342 call button, LTFRB
web portal link), link to Support, Install card, **Appearance** (Light /
Dark / System), **Language** (English / Filipino), **Fare rules** (rounding to
₱0.25; partial km rounded up; discount every day incl. weekends/holidays per
MC 2017-024; metered totals to the centavo), **Sources** (official link
ltfrb.gov.ph/fare-rates, fare data version and date, route planner credit:
LTFRB NCR route shapefile; DOTr/LTFRB matrices), offline note, disclaimer, and
the "Privacy policy" link.

### 5.9 Privacy (`#/privacy`)

Effective Oct 27, 2026, bilingual. Sections: what stays on the device
(settings, fare data, trips, ride in progress, saved/recent places); location
(only on request; ride tracker processed on device; planner sends chosen
coordinates to OSRM); third parties (Photon search text and stop coordinates
for landmarks, OpenStreetMap tiles, Vercel hosting and cookieless analytics);
overcharge reports and sharing stay on the device until shared; donations;
children; rights under RA 10173; changes; contact via GitHub Issues.

---

## 6. Fare data and rules

Data lives in `fares/*.json` with `fares/manifest.json` (version
`2026.09.28-1`, effective 2026-09-28, source LTFRB). Money is computed in
integer centavos.

| Mode id | Category | Method | Regular rate (discounted) |
|---|---|---|---|
| puj-traditional | jeepney | add-on | ₱14.00 first 4 km + ₱2.00/km (₱11.20 + ₱1.60) |
| puj-modern | jeepney | add-on | ₱17.00 first 4 km + ₱2.40/km (₱13.60 + ₱1.92) |
| uv-traditional | uv | per km | ₱2.60/km (₱2.08) |
| uv-modern | uv | per km | ₱3.00/km (₱2.40) |
| pub-city-aircon | bus-city | add-on | ₱18.00 first 5 km + ₱2.98/km (₱14.40 + ₱2.38) |
| pub-city-ordinary | bus-city | add-on | ₱15.00 first 5 km + ₱2.49/km (₱12.00 + ₱1.99) |
| pub-prov-ordinary | bus-provincial | add-on | ₱12.00 first 5 km + ₱2.20/km (₱9.60 + ₱1.76) |
| pub-prov-aircon / deluxe / super-deluxe / luxury | bus-provincial | per km | ₱2.45 / 2.60 / 2.70 / 3.35 per km |
| edsa-busway | busway | station matrix (directional) | 24 southbound / 23 northbound stations, min ₱18.00 (₱14.50) |
| taxi-regular / silver / gold | taxi | metered | flag-down ₱65 / 80 / 95, ₱13.50 / 17.50 / 20.50 per km, ₱2 / 2.50 / 3 per min |
| taxi-airport | taxi | metered, stepped | ₱115 first 500 m, ₱4 per 300 m, ₱4 per 2 min |
| tnvs | tnvs | metered per vehicle | hatchback ₱55+13/km, sedan ₱65+15, SUV ₱75+18, premium ₱165+36; ₱2–4/min; pick-up ₱15/km |
| lrt-1 / lrt-2 / mrt-3 | rail | station matrix (ticket types) | single journey and stored value; min ₱17 / ₱7 / ₱6 |

Rules: partial kilometres round up; add-on and per-km fares round to the
nearest ₱0.25; the discounted fare is computed from discounted rates (not 80%
of the rounded fare); metered totals are shown to the centavo with 20% off the
total for the discount; "old" fares come from the previous rates in the same
guides. Every row of every published LTFRB table is verified by tests
(`fixtures/`). Newer fare data published at `/fares/` is picked up on launch
and announced by the update banner.

---

## 7. Route planner engine

- Data: `public/routes/ncr.json` (459 KB, ≈ 115 KB gzipped), built by
  `scripts/import-routes.py` from the **LTFRB NCR PUJ/UV Express route
  shapefile** (WGS 84 / UTM 51N): 579 routes (464 traditional jeep, 22 modern
  jeep, 91 traditional UV, 2 modern UV) with names, LTFRB memorandum circular
  and simplified polylines. Rail and Busway lines come from the fare data's
  station coordinates (rail coordinates are approximate).
- Search (`src/lib/planner.ts`, run in a Web Worker): lines resampled every
  100 m; RAPTOR-style rounds (up to 3 rides = 2 transfers); walk 4.5 km/h, up
  to 700 m to the first stop and from the last, up to 300 m between lines;
  speeds jeep 13.8 km/h, UV 19 km/h, Busway 23 km/h, rail 30 km/h plus waits
  (4/7/5/5 min) and a 3-minute transfer penalty; rides shorter than 700 m
  (jeep) or 1 km (UV) are not offered; options that are much slower, or add
  rides without saving 5 minutes, are dropped. Jeep/UV routes may be ridden
  either way; the Busway is one-way per direction.
- Fares per ride come from the fare engine (distance along the route; station
  matrices for rail and Busway). Takes ≈ 0.2–0.5 s on a phone.
- Landmark names: Photon reverse geocoding near each stop, cached.

---

## 8. Storage, network and privacy

On-device storage (`localStorage`): `pamasahe-ph:prefs` (language, theme,
discount, last mode/category, dismissed banners), `pamasahe-ph:fares` (newer
fare data), `pamasahe-ph:trip` (trip legs), `pamasahe-ph:ride` (ride in
progress), `pamasahe-ph:places` (saved and recent places). No accounts, no
cookies, no server of its own.

External requests: `tile.openstreetmap.org` (map tiles), `photon.komoot.io`
(place search text; stop coordinates for landmark names),
`router.project-osrm.org` (start/end coordinates, calculator trip planner
only), Vercel (hosting, cookieless page-view analytics with hash routes
reported as paths such as `/calc/[category]`). GCash app/store only when the
user taps "Open GCash".

Offline: the app shell, code, icons and fare data are precached; the HTML is
fetched network-first and cached from the first visit; route data and map
tiles are cached on first use.

---

## 9. Accessibility and behaviour notes

- Bilingual UI (EN/FIL) switchable anytime; `<html lang>` follows it.
- Respects `prefers-reduced-motion` (3D still frame, no pin bobbing).
- Labels on all inputs; `role="switch"` discount toggle; `aria-current` in
  navigation; `aria-pressed` on option cards and chips; dialogs for the place
  sheet; status regions for loading/results.
- Works as an installed app (standalone display, theme colour `#0b3d91`).

---

## 10. Source map (for agents changing the site)

```
src/App.tsx                 routes, phone vs desktop shell
src/components/Nav.tsx      top bar + bottom nav
src/components/Sidebar.tsx  desktop sidebar
src/components/Hero3D.tsx   Home hero (search card, 3D jeep, price tag)
src/hero3d/                 three.js scene and the procedural patok jeepney
src/screens/                Home, Plan, Calculator, Compare, Tables, Trip, Support, About, Privacy
src/components/             FareCard, ReportOvercharge, RideTracker, RoutePicker, RouteMap,
                            PlanMap, PlaceSheet, PlaceSearch, RouteStrip, TripBar, InstallCard, ui
src/engine/                 fare engine (pure, tested)
src/lib/                    planner(+worker), rates, places, trip, ride, report, geocode, routing,
                            stations, prefs, theme, updater, router, share
src/content/privacy.ts      privacy policy text
src/i18n/{en,fil}.json      every UI string
fares/                      fare data + manifest; fixtures/ published tables
public/routes/ncr.json      route planner data
e2e/                        Playwright tests; src/**/__tests__ unit tests
marketing/                  promo videos and their sources
```

Stable test ids used by tests and useful for automation: `plan-open`,
`plan`, `plan-from`, `plan-to`, `plan-swap`, `plan-modes`, `plan-mode-chips`,
`plan-option`, `plan-steps`, `plan-total`, `plan-add`, `plan-map`,
`map-legend`, `place-sheet`, `sheet-input`, `sheet-place`, `sheet-here`,
`sheet-pin`, `sheet-tab-recent`, `pin-banner`, `pin-confirm`, `tile-<category>`,
`tile-rate-<category>`, `rate-summary`, `fare-card`, `fare-primary`,
`fare-secondary`, `trip-add`, `report-open`, `report-panel`, `ride-open`,
`ride-start`, `ride-stop`, `trip-bar`, `trip-total`, `trip-leg`,
`donate-card`, `open-gcash`, `privacy-link`, `hero`, `hero-stage`.
