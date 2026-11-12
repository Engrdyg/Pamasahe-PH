# Upgrade specification v1.0: implementation status

Handoff for the "Bayad Po — Product, UI/UX, and Engineering Upgrade
Specification" (12 Nov 2026), per its §15.2. It records what is implemented,
how it is tested, and what still needs data, field work or a decision. "Done"
means implemented and covered by automated tests in this repository; nothing
here has been through the commuter usability review (§13.3) or real-device
testing (§13.2) yet.

## Acceptance matrix (§13.1)

| ID | Scenario | Status | Where / how tested |
|---|---|---|---|
| AC-01 | Routes and My Trip one tap from a calculator | Done | 5-item nav (Home, Routes, Fares, My Trip, More); `app.test.tsx` navigation test |
| AC-02 | Home origin then destination | Done | Separate pickers, both kept, carried to planner with names; unit + e2e "Home search carries both ends" |
| AC-03 | 3D disabled/failing | Done | Static SVG jeep (`JeepStill`) renders first and stays; unit tests run without WebGL |
| AC-04 | Planner on a narrow phone without the map | Done | Map/List switch; sheet tabs Summary / Routes / Steps with tap controls; e2e checks List view hides the map |
| AC-05 | Change route ranking | Done | Lower fare / Shorter est. time / Fewer transfers / Less walking over the same valid options; `planRank.test.ts`, e2e |
| AC-06 | Read a selected route | Done | Numbered rides, signboard, landmarks, platform direction, walks, fare + passenger + basis, estimated time; e2e |
| AC-07 | Differing outbound/return paths | **Partly** | Direction model in place (`reverse: source / field / inferred / none`, `dir`), one-way routes followed only as drawn (`planner.test.ts`). The LTFRB file has one geometry per route, so every reverse is still *inferred* and labelled as such. Needs direction data (see below). |
| AC-08 | Barrier-separated transfer | **Partly** | Walks are straight line × 1.25 and labelled approximate; transfers limited to 300 m. There is no pedestrian network, so a river/fence/expressway between two lines is not detected. Needs pedestrian data. |
| AC-09 | Change passenger type | Done | Regular / Student / Senior / PWD; calculator, planner, trip labels and amounts follow it; old discount switch migrates |
| AC-10 | Fare details | Done | "View calculation and source": rule, distance and its source, rounding note, breakdown, document, effective date, limitations |
| AC-11 | Fare data update after saving a trip | Done | Legs keep a snapshot (mode, basis, distance, passenger, data version, effective date); stale legs show saved and recalculated fare |
| AC-12 | Remove / reorder legs | Done | ↑/↓ buttons, undo after remove/clear, edit distance, duplicate; unit test |
| AC-13 | Report from estimated distance | Done | "Possible fare difference", basis and estimate notice, "draft", no "submitted" wording |
| AC-14 | Geocoder / router / map service lost | Done | 8 s timeouts, retry state in place search, map-unavailable notice, inputs kept; offline banner |
| AC-15 | Interrupted GPS | Done | Gaps > 30 s kept apart from measured distance, shown, optional for the fare; `ride.test.ts` |
| AC-16 | Interrupted data update | Done | Whole-set validation before replacing; previous set kept; corrupt store falls back to bundled data; `updater.test.ts` |
| AC-17 | Keyboard, screen reader, large text, EN/FIL | **Partly** | Labels, focus return on sheets/dialogs, non-drag alternatives, live route count, all strings bilingual. A full WCAG 2.2 AA audit with assistive technology has not been done. |
| AC-18 | Analytics/logging | Done | Planner pages reported as `/plan` and event URL rewritten; no search text, plates or report text sent; `nav-privacy.test.ts` |

## Other requirements

- **Navigation, Fares hub, More** (§2, §3.4): done. Deep links unchanged; `#/guide` added.
- **Place search** (§4.1): station line in labels, per-field typed text restored when closed without a pick, searching / empty / offline / service-error states with retry, stale responses cancelled, ☆ separate from selecting, recent queries cached.
- **Route cards** (§4.4): fare + passenger, estimated time, numbered sequence, transfers + walking, uncertainty line, "why" badges (one winner per measure), expandable method text that matches the engine (fixed waits included; the 3-minute transfer penalty only ranks routes and is not added to the shown time).
- **Route count**: the spec suggests keeping five options; the product owner asked to show every reasonable route, so up to 30 are listed (within 2× the fastest + 20 min), sorted by the chosen preference.
- **Instruction ↔ map** (§4.5): tapping a step's number highlights and zooms to that ride; tapping a ride on the map opens and scrolls to its step. Colours, numbers and symbols match across cards, steps, legend and map.
- **Fare credibility** (§6): basis chips per method, per-mode authority/date, minimum-fare bracket wording, old fare moved to details.
- **My Trip** (§7.1–7.2): done as above. Trip share says amounts are as saved.
- **Saved commutes** (§7.3): saved from the planner, shown on Home, re-planned with current data; removable; cleared from More.
- **Report drafts** (§8): done. Reporting destination stays the LTFRB 1342 hotline for road modes and the line operator for rail; contact details were not re-verified in this pass.
- **Providers** (§10.1): `src/lib/providers.ts`, overridable with `VITE_TILE_URL`, `VITE_PHOTON_URL`, `VITE_PHOTON_REVERSE_URL`, `VITE_OSRM_URL`. Production use of the public OSRM demo and OSM tiles should be reviewed against their policies.
- **Guided trip** (§14.1): `#/guide`, manual steps, optional GPS distance to the get-off point with a near alert and stated limits.
- **Change calculator** (§14.2): "Change / Sukli" in fare cards and the guided trip, labelled when the fare is an estimate.
- **Route-issue feedback** (§14.3): destination is the project's public GitHub Issues (prefilled, label `route-feedback`); nothing is sent from the app; reports never change route data automatically.

## Not done, and why

- **Direction-specific geometry and field-verified boarding points** (§5.1–5.2): needs source or field data. Add dated records to `scripts/route-directions.json` (merged by `scripts/import-routes.py`); routes with `reverse: "none"` are then only ridden as drawn, and separately stored directions (`dir`) are supported.
- **Pedestrian-aware transfers** (§5.3): needs a pedestrian network (e.g. OSM footways and crossings) processed into the route file.
- **Operating hours / disruptions** (§5.4): no maintained source; the app says times are estimates and implies no live service.
- **Maintenance dashboard** (§11.3): the spec scopes it as a separate capability with authenticated access and audit history. Data changes still go through version control (`fares/`, `scripts/`).
- **Dark-mode basemap** (§9.2): the light, desaturated basemap is kept in both themes (dimmed in dark) because the product owner asked for a light map.
- **Usability review and device testing** (§13.2–13.3): need real commuters and devices.

## Checks run for this handoff

`npm run typecheck`, `npm run lint`, `npm test` (unit + fixtures), `npm run build`
(main bundle ≈ 144 KB gzipped, budget 150 KB) and `npx playwright test`
(Pixel 5 profile, including route planner, ranking, steps, list view, feedback,
guided trip, saved commute, Home search, trip and report flows).
