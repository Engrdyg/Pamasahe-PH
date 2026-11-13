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

Supporting features: passenger types (Regular, Student, Senior, PWD; 20% discount), comparison of
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

| URL | Screen | Title shown in top bar (EN / FIL) | Back target | Active nav item |
|---|---|---|---|---|
| `#/` | Home | App name "Bayad Po" + effective-date badge | — | Home |
| `#/plan` | Route planner | "Route planner" | — | Routes |
| `#/plan/<lat,lng>/<lat,lng>` | Route planner with ends set (`-` for a missing end) | same | — | Routes |
| `#/fares` | Fares hub (vehicle tiles) | "Fares" / "Pamasahe" | — | Fares |
| `#/calc/<category>` | Fare calculator for a category | category name | Fares | Fares |
| `#/trip` | My trip (multi-leg total) | "My trip" | — | My Trip |
| `#/guide` | Guided trip for the route picked in the planner | "Guided trip" / "Gabay sa biyahe" | planner | Routes |
| `#/more` | More (secondary screens, settings, data) | "More" / "Iba pa" | — | More |
| `#/compare` | Compare modes | "Compare modes" | More | More |
| `#/tables` | Fare tables | "Fare tables" | More | More |
| `#/support` | Donate | "Support this app" | More | More |
| `#/about` | About & report | "About & report" | More | More |
| `#/privacy` | Privacy policy | "Privacy policy" | More | More |

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
  ⌂ Home · ⌖ Routes (Ruta) · ₱ Fares (Pamasahe) · 🧭 My Trip (Biyahe, with a
  yellow leg-count badge when the trip has legs) · ⋯ More (Iba pa). The active
  item is brand-blue; others grey. There is no floating trip pill: My Trip and
  its badge are the single entry point to the trip.
- **Update banner** (when newer fare data arrives): yellow strip under the top
  bar, "Fares updated — effective {date}" with "Dismiss".

### Tablet / desktop layout (≥ 768 px)

- Persistent **left sidebar** instead of top/bottom bars: logo + app name +
  effective badge; primary menu Home, Routes, Fares, My Trip (badge); a "More"
  group with Compare, Fare tables, Support, About; the discount toggle;
  Appearance chips (Light / Dark / System); Language chips (English /
  Filipino); "Privacy policy" link; "LTFRB 24/7 Hotline: 1342". The sidebar
  scrolls on short screens.
- Content column (max ≈ 1150 px) with a page title and round back button.
- Calculators use two columns (inputs left, fare card right).

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

1. **Hero** (full width; on desktop a rounded card with text left, jeep right):
   - Kicker "BAYAD PO! 👋", headline **"Where are you going?" / "Saan ka
     pupunta?"**, sub-line.
   - **Search card** with two real controls: "● Where will you get on?" (blue
     dot) opens the origin place picker and "● Where will you get off?"
     (yellow dot) opens the destination picker (search, stations, saved,
     recent, "current location"; no map pin on Home). A picked place shows
     its name and locality; the other end is kept. Location is requested only
     when "current location" is chosen; if denied, a note says search still
     works. **"Find a route ›"** opens `#/plan/<from>/<to>` with both ends
     and their names (shared in memory with the planner, so going back keeps
     them).
   - Up to four **saved (★) / recent (🕘) place chips**; tapping one sets the
     destination.
   - Jeep illustration: a static SVG jeepney renders immediately and stays if
     WebGL is unavailable or the 3D chunk fails; the **3D patok jeepney**
     (stainless body, flames, chrome mags, bull bar, horses, LED strips, open
     doorways, benches and grab rails) fades in once rendered and slowly turns
     (drag to spin; still under reduced motion). Yellow price tag "JEEP,
     MINIMUM ₱14.00" (follows the discount).
2. **"Fares by vehicle"** heading with an "All fares ›" link to `#/fares`.
3. **Passenger chips** (phone, compact).
   Saved commutes (★ "Home → Work", one tap re-plans, ✕ removes) appear in
   the hero above the saved/recent chips.
4. **Compact vehicle tiles** (same as the Fares hub, without hints).
5. **Install card** when the browser offers installation.

The route search and the first fare tiles are visible on a 390×844 phone
without scrolling.

### 5.1a Fares hub (`#/fares`)

Intro "Pick a vehicle to compute its fare.", passenger chips (phone), and the
eight category tiles (Jeepney, Train, EDSA Busway, UV Express, City Bus,
Provincial Bus, Taxi, TNVS). Each tile: icon, name, hint, a **basis label**
("Minimum fare", "Per-km rate", "Flag-down", "Station matrix") and the amount
of the same mode (e.g. "₱14.00 · first 4 km", "₱2.60 per km", "From ₱65.00
flag-down", "From ₱6.00"). A note explains that these are different kinds of
amounts, not trip totals. Links to Fare tables and Compare.

### 5.1b More (`#/more`)

List rows (icon, name, hint, ›): Compare, Fare tables, Support, About, Privacy
policy. **Settings** card: passenger type chips, Appearance,
Language. **Data on this device** card: "Clear saved and recent places (n)"
and "Clear trip (n legs)", each with a confirmation. LTFRB hotline 1342.

### 5.2 Route planner (`#/plan`) — Sakay.ph-style

Layout on phones (top to bottom; the header is sticky under the top bar):

- **Header row** (compact, horizontal): `[● From]  ⇄  [● To]` — two tappable
  fields (placeholders "From"/"To", FIL "Sakayan"/"Babaan"; blue and yellow
  dots) with a swap button between them.
- **Second row**: "🚍 All modes ▾" (FIL "Lahat ng mode") and "Clear"
  (Burahin). Opening it shows toggle chips **Jeep, UV Express, Train, Busway**
  in their colours; turning one off re-plans without it ("2 of 4 modes").
- **Map / List switch** (phones, once there are results): **Map** shows the
  map with a sheet below it; **List** hides the map entirely (map-free use).
- **Map** (Leaflet + OSM): before results it fills the screen down to the
  bottom nav (measured). With results its height follows the sheet tab:
  Summary ≈ all but 200 px, Routes ≈ 50 %, Steps ≈ 42 %.
- **Sheet tabs** (tap, no dragging): **Summary** (the selected option + "See
  the steps"), **Routes (N)** (sort bar + every option), **Steps** (the
  instructions card). On desktop and in List view the sort bar, all options
  and the steps are shown in one column.

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

**Sort bar**: "17 routes found" (announced to screen readers) and radio chips
**Lower fare / Shorter est. time / Fewer transfers / Less walking** (FIL "Mas
mura / Mas mabilis na estimate / Kaunting lipat / Kaunting lakad"),
remembered on the device. The same options are re-ordered; nothing is
removed.

**Result options** (all reasonable routes, up to 30, within 2× the fastest
+ 20 min; plus "Walk" for short trips): fare and passenger type ("₱13.00 ·
Regular"), "≈ 33 min · estimated", **why badges** (one winner per measure:
"★ Lowest fare", "★ Shortest est. time", "★ Fewest transfers", "★ Least
walking"), numbered coloured ride chips ("1. 🚆 LRT-2"), "Direct · 900 m walk"
or "2 transfers · 750 m walk", and an uncertainty line ("≈ fare from route
length (estimate)" or "✓ official station fares", plus "↺ return direction
inferred" when a ride goes against the drawn route). The selected option has
a blue ring.

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
  Church" / "… to {destination}", with "Approximate: straight-line distance
  plus 25%; crossings and footbridges are not checked."
- Ride rows with a coloured left border and a numbered colour badge (tap it to
  highlight and zoom to that ride on the map; tapping a ride line on the map
  opens Steps and scrolls to it): icon, mode and route name.
  - Jeep/UV: "▸ Signboard: Cubao - Vito Cruz via E. Rodriguez", "▸ Get on near
    …", "▸ Get off near …", "Not verified: ask the driver if it passes …", and
    "↺ You ride this route opposite to how LTFRB drew it… not verified" when
    the reverse is only inferred. A "Report a route problem" link.
  - Rail/Busway: "▸ Board at Recto station", "▸ Platform: towards Antipolo",
    "▸ Get off at … station", "Station location is approximate; entrances are
    not verified."
  - Distance or stations, "≈ 21 min", the memorandum circular, passenger type
    and fare basis, the modern-jeep alternative fare, and the ride's fare.
- An amber **assumptions note** (authorised routes ≠ running now; return
  direction assumed; points approximate; ask the driver or barker) and an
  expandable **"How routes and times are worked out"** that matches the
  engine.
- Total for the passenger type, then **"▶ Start trip"** (guided trip), **"+ Add
  all rides to trip"** (legs keep a snapshot) and **"☆ Save this commute"**.

**Report a route problem** dialog: what is wrong (boarding/alighting point,
landmark or street, route line, not running / service changed, other),
details, an optional tick to include the get-on spot rounded to ~100 m, and
"Open on GitHub ↗", which opens a prefilled public issue (label
`route-feedback`). Nothing is sent from the app.

Shown times ("≈ 38 min") include ride time at average speeds, walking and a
fixed wait for each ride; no live traffic. The tooltip and method text say so.

**No route found**: "No route found in the available route data within a short
walk…", a coverage note (a route missing from this data may still exist),
"Include all modes" when some modes are switched off, and "Check fares by
vehicle". Place search failures keep the typed text and show "Try again"
(or an offline message); stations and saved places still work. Typed text is
restored if the sheet is closed without a pick. If map tiles fail, a notice
says the steps and fares below still work. Offline without route data, the
planner says to connect once to download it.

**Notes** (shown with results): drag hint; route data credit (LTFRB NCR
jeepney and UV Express route data, 579 routes, per LTFRB memorandum circulars,
plus LRT-1, LRT-2, MRT-3, EDSA Busway); return direction assumed (not
verified); how times are estimated; landmarks from OpenStreetMap; not
affiliated with LTFRB.

### 5.2a Guided trip (`#/guide`)

Started from "▶ Start trip". Shows "from → destination", "Step 2 of 5" and
one card at a time: a walk ("🚶 Walk about 550 m to where you get on: Recto
station") or a ride (numbered colour badge, route or line, signboard or
platform, "Get on at …", **"■ Get off at …"**, fare for the passenger type and
a change calculator). Below it "Next: transfer at …". Buttons "‹ Back" and
"Next step ›" / "✓ Arrived". An optional checkbox "Show my distance to the
next stop (GPS)" shows the straight-line distance and GPS accuracy, and within
~250 m of the get-off point a yellow alert "Your get-off point is near. Get
ready to say “Para po!”" (vibrates once). A note explains GPS only works with
the page open and does not track the vehicle. Kept for the browser session.

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
3. **Passenger chips** (phones): Regular / Student / Senior citizen / PWD
   (FIL Regular / Estudyante / Senior citizen / PWD); a discounted type shows
   "20% discount with a valid ID. The fare guides publish one discounted fare
   for students, seniors and PWD." The choice is remembered; an old on/off
   discount setting becomes "Student".
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

**Fare card** (result), top to bottom:
- Passenger label and primary fare large ("REGULAR ₱30.00" or "STUDENT /
  SENIOR / PWD ₱24.00"), the other amount smaller.
- Trip distance or station pair ("12 km", "North Avenue → Ayala").
- **Basis chip** plus the mode's own authority and effective date: green
  "Published station fare" (Busway/rail matrices); amber "Distance-based
  fare" (jeep/UV/bus) or "Estimate · meter or app may differ" (taxi/TNVS),
  e.g. "LRMC · effective Apr 2, 2025".
- Plain notes: for a short jeep ride "1 km is within the minimum fare, which
  covers the first 4 km."; otherwise "4.2 km is rounded up to 5 km for the
  fare."; direction/ticket; "Beyond published table…" warning; metered
  "Estimate. The meter or the booking app shows the actual fare."
- **"View calculation and source"** (expandable): fare rule, distance used and
  where it came from (entered by you / road estimate (OSRM), not certified /
  GPS estimate), metered breakdown (Flag-down, Distance, Time, Pick-up,
  Total), old-versus-new fare, the source document and effective date (e.g.
  "LTFRB · Traditional PUJ.pdf · effective Sep 28, 2026"), and a limitation
  note for that basis.
- Buttons: **"+ Add to trip"**, **"Share"**, **"🪙 Change"** (cash handed over,
  ₱20/₱50/₱100 shortcuts → "Change: ₱x" or "Short by ₱y"; labelled when the
  fare is an estimate), **"⚠ Review fare difference" (FIL "Suriin ang diperensya sa pamasahe")**.

**Fare report panel** (inline, red-tinted; "Draft report" / "Burador ng ulat"): says it
only prepares a draft and nothing is sent until the person copies, shares or
calls; shows the official fare and its basis; fields "How much were you
charged? (₱)", plate/body number, place, notes. Result: **"Possible fare
difference: ₱10.00 (+33.3%)"** for distance-based and metered fares, "Fare
difference" only for published station fares. Preview text titled "Fare
report (draft)" with date/time in Philippine time, the fare basis, an
estimate notice when relevant, and the source. Buttons "Call LTFRB 1342" (not
for trains), "Copy report" ("Draft copied. It has not been submitted yet."),
"Share report", "Close".

**Ride tracker** (GPS, Strava-like) card: "Start ride" → live "Distance" (km)
and "Time" (m:ss), "Tracking · n GPS fixes · ±x m", a small map of the path,
"End ride" (red) and "Discard". Distance and time feed the fare live. Keeps
the screen awake (Wake Lock), survives reloads, filters bad fixes (accuracy
> 60 m, jitter, > 150 km/h jumps). Messages for waiting for GPS, weak signal,
no permission, and "keep the app open". If no fix arrives for more than 30 s
(app in the background, tunnel, reload), the straight-line distance across
that gap is kept apart from measured distance and shown in an amber note
("n GPS gaps: x km not measured…") with a ticked "Include gap distance in
the fare" checkbox.

### 5.4 Compare (`#/compare`)

"Fare for the same distance across all distance-based modes, cheapest first."
A distance input, then a list of every distance-based mode with its regular
and discounted fare for that distance, sorted cheapest first (past a mode's published table the fare is computed
from the same formula; no label is shown).

### 5.5 Fare tables (`#/tables`)

Mode chips, then the published-style table for that mode: km rows with New
(regular / discounted) and Old fares, a "Find km" search box, and the note
"Generated from the LTFRB formula; matches the published guide row for row."
For station modes: pick a from-station and see fares to every other station
(per direction or ticket type). Modes without a table say so.

### 5.6 My trip (`#/trip`)

Big "TOTAL FARE · REGULAR ₱100.25", the other passenger total, note "Each leg
is paid separately…". Numbered legs: mode, trip label, basis, source, fare
data version, fare; ↑ / ↓ buttons to reorder; "Edit distance" for
distance-based legs (re-priced with current data); "Duplicate"; "Remove" with
an **Undo** bar (also after "Clear trip"). Each leg stores a snapshot (mode id, basis,
distance and its source, passenger type, fare-data version, effective date,
time saved). When newer fare data changes a leg's mode, an amber note shows
the saved amount, the recalculated current fare (distance legs) and "Use the
current fare"; the saved snapshot stays until then. Empty state offers "Plan
a route" and "Add another leg" (to `#/fares`). Stored on the device.

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
  100 m; RAPTOR-style rounds (up to 3 rides = 2 transfers); walk 4.5 km/h on
  straight lines × 1.25, up to 700 m (straight) to the first stop and from the
  last, up to 300 m between lines; speeds jeep 13.8, UV 19, Busway 23, rail
  30 km/h plus a fixed wait per ride (4/7/5/5 min); a 3-minute penalty per
  transfer is used only to choose routes (not added to the shown time); rides
  shorter than 700 m (jeep) or 1 km (UV) are not offered. Transfers are
  explored up to 1.3× the best time + 10 min; for every line reaching the
  destination the best way to it is kept, plus every direct line; routes are
  listed up to 2× the fastest + 20 min (max 30), dropping only options that
  add a ride to a shorter one with the same vehicles and repeats of the same
  vehicle sequence.
- Direction model: each route may carry `reverse` (`source`, `field`,
  `inferred` = default, `none` = one-way) and `dir` (`outbound`, `return`,
  `loop`) from `scripts/route-directions.json`. The LTFRB file has one
  geometry per route, so today every reverse is inferred and rides against
  the drawn direction are flagged (`against`). Busway lines are one-way;
  rail legs carry the platform direction (`towards`).
- Fares per ride come from the fare engine (distance along the route; station
  matrices for rail and Busway). Takes ≈ 0.2–0.5 s on a phone.
- Landmark names: Photon reverse geocoding near each stop, cached.

---

## 8. Storage, network and privacy

On-device storage (`localStorage`): `pamasahe-ph:prefs` (language, theme,
passenger type, route sort, last mode/category, dismissed banners),
`pamasahe-ph:fares` (newer fare data, validated as a whole set) and
`pamasahe-ph:fares-prev` (the set it replaced), `pamasahe-ph:trip` (trip legs
with snapshots), `pamasahe-ph:ride` (ride in progress, including GPS gaps),
`pamasahe-ph:places` (saved and recent places), `pamasahe-ph:commutes` (saved
commutes); `sessionStorage` `pamasahe-ph:guide` and `pamasahe-ph:guide-step`
(guided trip). No accounts, no
cookies, no server of its own.

External requests (endpoints in `src/lib/providers.ts`, overridable with
`VITE_TILE_URL`, `VITE_PHOTON_URL`, `VITE_PHOTON_REVERSE_URL`, `VITE_OSRM_URL`;
8-second timeouts): `tile.openstreetmap.org` (map tiles), `photon.komoot.io`
(place search text; stop coordinates for landmark names),
`router.project-osrm.org` (start/end coordinates, calculator trip planner
only), Vercel (hosting, cookieless page-view analytics with hash routes
reported as paths such as `/calc/[category]`; route-planner links are always
reported as `/plan`, and the event URL is rewritten the same way, so
coordinates never reach analytics). GCash app/store only when the
user taps "Open GCash". Route-problem feedback opens github.com in the
browser; the app itself sends nothing.

Offline: a dark banner says the calculators, tables and trip still work and
gives the fare data version and date; place search, maps and new route data
need internet.

Offline: the app shell, code, icons and fare data are precached; the HTML is
fetched network-first and cached from the first visit; route data and map
tiles are cached on first use.

---

## 9. Accessibility and behaviour notes

- Bilingual UI (EN/FIL) switchable anytime; `<html lang>` follows it.
- Respects `prefers-reduced-motion` (3D still frame, no pin bobbing).
- Labels on all inputs; radio-group passenger and sort chips; focus returns to the opener when sheets and dialogs close; non-drag alternatives for pins (search), sheets (tabs) and trip legs (↑/↓); `aria-current` in
  navigation; `aria-pressed` on option cards and chips; dialogs for the place
  sheet; status regions for loading/results.
- Works as an installed app (standalone display, theme colour `#0b3d91`).

---

## 10. Source map (for agents changing the site)

```
src/App.tsx                 routes, phone vs desktop shell
src/components/Nav.tsx      top bar, bottom nav, NAV_ITEMS, navSection(), trip badge
src/components/Sidebar.tsx  desktop sidebar
src/components/Hero3D.tsx   Home hero frame (static JeepStill SVG, 3D jeep, price tag)
src/components/FareTiles.tsx vehicle tiles with basis labels (Home, Fares)
src/hero3d/                 three.js scene and the procedural patok jeepney
src/screens/                Home, Plan (lazy), Guide (lazy), Fares, More, Calculator, Compare, Tables, Trip, Support, About, Privacy
src/components/             FareCard, ReportOvercharge, RideTracker, RoutePicker, RouteMap,
                            PlanMap, PlaceSheet, PlaceSearch, RouteStrip, InstallCard, JeepStill, ChangeCalc,
                            RouteFeedback, ui (Chips, PassengerPicker, …)
src/engine/                 fare engine (pure, tested)
src/lib/                    planner(+worker), planRank, rates, places (+plan draft), stationPlaces, commutes, guide,
                            feedback, providers, useOnline, trip (snapshots), ride (gaps), report, geocode, routing,
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
