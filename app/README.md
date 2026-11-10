# Olkaria Gas Concentration Dashboard

Frontend for the Olkaria gas-monitoring dashboard. Three separate modules
share one shell:

1. **SO₂/CH₄ satellite module** — coordinate-driven, live GEE/TROPOMI fetch
   (the original module)
2. **CO₂ ANN Forecast** — upload a CSV, run the LSTM-GRU model, view
   actual-vs-predicted and correlation outputs
3. **AERMOD Dispersion** — upload met data + per-gas emission sources, view
   5 dispersion outputs (1hr/8hr/24hr/monthly fields + diurnal-vs-receptor)
   per gas (CO₂, CH₄, H₂S)

React 19 + TypeScript + Tailwind v4, built with Vite.

## Structure (MVC)

```
src/
├── models/          # M — TypeScript types
│   ├── analysis.types.ts    # SO2/CH4 module + shared Page union
│   ├── co2ann.types.ts      # CO2 ANN module
│   ├── dispersion.types.ts  # AERMOD module
│   └── auth.types.ts
├── views/           # V — screen-level components
│   ├── LandingView.tsx          # public
│   ├── LoginView.tsx            # public
│   ├── RequestAccessView.tsx    # public
│   ├── DashboardView.tsx        # authenticated shell, routes on `page`
│   ├── NewAnalysisView.tsx      # SO2/CH4 module
│   ├── Co2AnnView.tsx           # CO2 ANN module (upload-driven)
│   ├── DispersionView.tsx       # AERMOD module (upload-driven)
│   ├── ResultsLibraryView.tsx
│   └── SettingsView.tsx
├── controllers/     # C — state + lifecycle logic, no markup
│   ├── useAnalysisJob.ts      # SO2/CH4 — simulated queued/fetching/running/complete
│   ├── useUploadAnalysis.ts   # CO2 ANN + AERMOD — plain idle/running/complete/failed
│   ├── useQueryParams.ts
│   └── useAuth.ts
├── components/      # reusable presentational pieces
│   ├── layout/      # Header, NavRail, NavIcons, QueryPanel, AuthLayout, UserMenu
│   ├── map/         # MapPicker (Leaflet), MapModal
│   ├── charts/      # TimeSeriesChart, MetricRow, ResultsSummaryCards
│   ├── status/      # StatusPill, JobPill, AnalysisStates
│   ├── upload/      # FileSlot — drag-and-drop upload used by CO2 ANN + AERMOD
│   └── ui/          # Card, PlaceholderBox
├── lib/             # mockData.ts (temporary), co2annClient.ts, dispersionClient.ts
├── App.tsx          # router — public routes + RequireAuth guard
└── index.css        # Tailwind theme tokens (palette, fonts)
```

## Running

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Vite proxies `/api` → `http://localhost:4000` (the Express server).

## Server integration points

Three places connect to `server/` when it's ready. Nothing else should need to change:

| File | Currently | Becomes |
|---|---|---|
| `controllers/useAnalysisJob.ts` | simulates the job sequence on a timer | `POST /api/analyses`, then subscribe to the Socket.io room for `jobId` and `setStatus` on each `job:*` event |
| `lib/mockData.ts` | hardcoded `LIBRARY_ROWS` | `GET /api/analyses` |
| `components/charts/` | `PlaceholderBox` stand-ins | real Recharts line chart + D3 heatmap fed by `AnalysisResult` |
| `controllers/useAuth.ts` | mocked in-memory session | `POST /api/auth/login`, `/request-access`, `/logout` + token storage |

The views read only `status` and call `runAnalysis` — they don't know whether the
job is simulated or real, so swapping in the API touches the controller only.

## CO₂ ANN + AERMOD — upload modules

These two modules were pivoted from a live-fetch design to upload-based
analysis (the analysis team found auto-download of source data too fragile
to build against). Both follow the same shape:

| File | Currently | Becomes |
|---|---|---|
| `controllers/useUploadAnalysis.ts` | submit → poll job hook: `idle → queued → running → complete/failed`, persists `jobId` to `sessionStorage` so a refresh reattaches | unchanged — it already speaks the real server's shape |
| `controllers/useElapsed.ts` | ticking `M:SS` since `startedAt` (server-supplied once real, so it survives reattach) | unchanged |
| `lib/co2annClient.ts` | `submitCo2AnnAnalysis({co2Data, metData})` / `pollCo2AnnAnalysis(jobId)` — simulated ~6s timeline standing in for the real ~3 min run | `POST /api/co2-ann/analyze` (multipart: `co2Data`, `metData`) → `{jobId}`, `GET /api/co2-ann/jobs/:jobId` (see `server/API_CONTRACT.md`) |
| `lib/dispersionClient.ts` | `submitDispersionAnalysis(files)` / `pollDispersionAnalysis(jobId)` — simulated ~9s timeline standing in for the real ~8-10 min run | `POST /api/dispersion/analyze` → `{jobId}`, `GET /api/dispersion/jobs/:jobId` |
| `views/Co2AnnView.tsx` | 2 required FileSlots (CO₂ readings, weather/met data — separate files, merged server-side by date) → 2 output cards, elapsed-time + "you can leave this page" messaging while running | unchanged once the clients above are real |
| `views/DispersionView.tsx` | met FileSlot (required) + 3 gas FileSlots (≥1 required) → gas-tabbed results, 4 field cards + 1 diurnal card per gas | unchanged once the clients above are real |

**This is a real async job, not a plain request/response.** The analysis
team confirmed real runtimes of ~3 minutes (CO₂ ANN) and ~8-10 minutes
(AERMOD) — both far too long to hold an HTTP connection open, and a refresh
mid-run would otherwise lose the result outright. So `useUploadAnalysis`
submits, gets a `jobId` back, and polls every 4s until the job resolves; the
`jobId` is persisted to `sessionStorage` so a refresh reattaches to the
same in-flight job instead of restarting it. `server/` (rebuilt to match —
see its README and `API_CONTRACT.md`) backs this with BullMQ + Redis for
the queue and Mongo for durable job/result storage.

**Output contract, confirmed with the analysis team:**
- CO₂ ANN → exactly 2 outputs: "Actual vs Predicted Values Using SARIMA and
  ANN" (line chart) and Pearson correlation with CO₂ (bar chart). See
  `co2ann.types.ts`.
- AERMOD → 5 outputs per gas (CO₂, CH₄, H₂S — only for gases with an
  uploaded emission-source file): spatial dispersion fields at 1hr, 8hr,
  24hr, and monthly averaging windows, plus one diurnal-concentration-vs-
  wind-speed chart per receptor (R1–R4). See `dispersion.types.ts`.

`dispersion.types.ts` defines a local `ContourFeatureCollection` GeoJSON
shape rather than depending on `@types/geojson`, since that package hasn't
been added yet — swap it for the real package types once server-side
`geojsoncontour` output is actually wired up and rendered (Leaflet/
MapLibre/react-map-gl over satellite tiles).

## Job status contract

The `JobStatus` union in `models/analysis.types.ts` must stay in sync with the
server's status enum:

| Status | Socket event | UI |
|---|---|---|
| `queued` | `job:queued` | gray pill "Queued" |
| `fetching` | `job:fetching` | amber pill "Fetching satellite data" |
| `running` | `job:running` | amber pill "Running model" |
| `complete` | `job:complete` | green pill + coverage badge |

`failed` is handled in `JobPill` and `AnalysisStates`, but nothing sets it yet —
the simulated controller never fails. Wire it when the server can report failures.

## Routes

| Path | Access | View |
|---|---|---|
| `/` | public | Landing — what the tool does, methodology, limitations |
| `/login` | public | Sign in |
| `/request-access` | public | Access request form + pending confirmation |
| `/app` | authenticated | Dashboard shell (analysis / library / settings) |

## Theming

Light and dark themes, user-toggleable (not just `prefers-color-scheme`).

- **`controllers/useTheme.tsx`** — `ThemeProvider`/`useTheme`. Reads system
  preference on first visit, persists the user's choice to `localStorage`,
  toggles a `.dark` class on `<html>`.
- **`components/ui/ThemeToggle.tsx`** — sun/moon button, present in the
  dashboard `Header`, `AuthLayout`, and the landing page nav.
- **`index.css`** — every color is a CSS custom property under `:root`
  (light) and `.dark` (dark overrides). Components reference tokens via
  Tailwind arbitrary values, e.g. `bg-[var(--color-surface)]`,
  `text-[var(--color-danger)]` — never raw hex — so nothing needs a
  per-component `dark:` variant.

Two things are **intentionally excluded** from theming and stay fixed in both
modes: `components/ui/BrandMark.tsx` (logo identity) and the map pin/circle
color in `components/map/MapPicker.tsx` (map tiles are their own light
color-world regardless of app theme). A couple of small "always white"
elements (the settings toggle-switch knob, the translucent map-expand
overlay) are deliberate too, for the same reason real toggle switches and
map overlay chrome usually don't follow app theme.

Adding a new color: add the token to both blocks in `index.css`, then
reference it as `var(--color-your-token)` — never hardcode a hex value in a
component.

## Auth model

**Request access, admin-approved** — not open signup. Each run retrieves satellite
data and fits models on demand, so accounts are approved individually. The request
form collects name, institutional email, institution, role, and intended use; the
submitted state shows a "Pending review" confirmation.

## Not yet built

- **Real charts everywhere** — SO₂/CH₄, CO₂ ANN, and AERMOD result cards are
  all `PlaceholderBox` stand-ins; real charts need `server/` (or the
  analysis service directly) actually running
- **CO₂ ANN + AERMOD backend** — `co2annClient.ts` / `dispersionClient.ts`
  are fully simulated; no server endpoint exists yet (see above)
- **AERMOD contour rendering** — dispersion fields need server-side
  `geojsoncontour` output plumbed to a Leaflet/MapLibre layer; not started
- **Detection floor banner** is hardcoded; should render from
  `AnalysisResult.detectionFloor`
- **Settings persistence** — the form renders but does not save anywhere
- **Admin view** for approving access requests
- **Toasts** for run-complete / export-ready / error notifications
- **Saved sites** and **results comparison** (see backlog discussion)
- **Real map tiles in restricted networks** — MapPicker loads Leaflet from
  `unpkg.com`; works anywhere with normal internet access
- **Whether SO₂/CH₄ also moves to upload-based analysis** — open question;
  as of now only the AERMOD-source notebook has been confirmed to move to
  uploads, the satellite module's live-fetch design is still under
  discussion
