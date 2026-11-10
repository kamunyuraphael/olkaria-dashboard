# API contract — CO₂ ANN + AERMOD Dispersion

Both modules are real async jobs, not synchronous requests. Confirmed real
runtimes from the analysis team: **CO₂ ANN ~3 minutes**, **AERMOD dispersion
~8-10 minutes** — both too long to hold an HTTP request/response open, so
each endpoint follows the same submit → poll shape: `POST /analyze` starts
the job and returns a `jobId`, `GET /jobs/:jobId` is polled until it resolves.

All routes require `Authorization: Bearer <token>` (see `middleware/auth.middleware.ts`).
AERMOD dispersion's frontend polling goes through the `useUploadAnalysis` hook
(`app/src/controllers/useUploadAnalysis.ts`), 4s interval, `jobId` persisted to
`sessionStorage` so a refresh mid-run reattaches instead of losing the job.
CO₂ ANN merged into Module A's coordinate-driven flow (`useAnalysisJob.ts`) —
see that section below for its own request shape.

## Supported file formats (AERMOD dispersion only)

Every upload field on the dispersion module accepts **CSV, TSV, or Excel
(.xlsx/.xls)** — the constant lives in one place on each side
(`app/src/lib/fileFormats.ts`, `server/src/middleware/upload.middleware.ts`'s
`ALLOWED_EXTENSIONS`), so widening or narrowing the set later is a one-line
change, not a hunt through every field. CO₂ ANN no longer uploads files (see
below), so this section now applies to dispersion alone.

**Why this set and not more:** CSV/TSV/XLSX/XLS covers everything
`pandas.read_csv`/`read_excel` handle natively, and it's the full range of
what a researcher's instrument export or Excel workbook actually arrives
as. JSON, Parquet, etc. were deliberately left out — nothing in the CO₂ ANN
or AERMOD notebooks produces or expects them, and adding them would mean a
second parsing path in the analysis-service for no current benefit. Add
them in both places above if that ever changes.

**Why validation happens in three places, not one:**
1. **`FileSlot.tsx`, client-side** — checks the dropped/selected file's
   extension against the same allowlist before it's even added to state.
   This exists purely for instant feedback; the HTML `accept` attribute
   alone only filters the native picker dialog, it does nothing for
   drag-and-drop and nothing server-side, so relying on it alone would mean
   a drag-dropped `.docx` sails through with no warning until the job fails
   minutes later.
2. **`upload.middleware.ts`, server-side, by extension** — rejects an
   obviously-wrong upload with a clean `400` before a job is ever created,
   so a bad upload doesn't consume a queue slot or an analysis-service call.
   This is **not real validation** — a file extension is just a name,
   trivially spoofed — it's a cheap first filter.
3. **The analysis-service, by content, when it actually parses the file**
   — this is the only check that can't be faked, and it's unavoidable: even
   a `.csv`-named file can be garbage. A parse failure here throws inside
   the worker, which marks the job `failed` with a readable
   `failureReason`; `GET /jobs/:jobId` returns that as `{stage: "failed",
   error}`, which the frontend already renders in its "Analysis failed"
   state. No separate error-reporting path needed — job failure IS the
   error-reporting path.

None of the three layers alone is sufficient (client-side is bypassable,
extension-based is spoofable), and content-based parsing alone is
sufficient but slow to surface (a multi-minute job runs before the user
learns their file was junk). Layering them means most mistakes are caught
in under a second, and the rest are still caught correctly, just later.

## Auth

No self-service signup. Every account is created by an admin approving a
pending access request — each analysis run has a real compute cost (3-10
minutes against the analysis-service), so access is gated rather than open.
The very first admin account comes from `npm run seed:admin`
(`src/scripts/seedAdmin.ts`), not from this API.

### `POST /api/auth/login`

```json
{ "email": "...", "password": "..." }
```
**200** `{ "token": "<jwt>", "user": { "id", "name", "email", "institution", "role" } }`
**401** — wrong email/password (deliberately the same message either way, so the response doesn't reveal whether an email is registered).

### `POST /api/auth/request-access`

```json
{ "name": "...", "email": "...", "institution": "...", "role": "researcher" | "policy", "purpose": "..." }
```
**201** `{ "id": "...", "status": "pending" }`
**400** — a required field is missing or `role` isn't `researcher`/`policy`.

### `GET /api/auth/me`

Restores a session from a stored token (e.g. after a page refresh) rather
than trusting stale client-side data.
**200** `{ "user": { "id", "name", "email", "institution", "role" } }`
**401** — missing/invalid/expired token. **404** — token is valid but the user no longer exists.

### `POST /api/auth/logout`

**204**. JWTs are stateless, so there's no server-side session to clear —
this exists for the frontend to call on sign-out; the actual logout is the
client discarding its token.

### `GET /api/auth/access-requests?status=pending` — admin only

**200** — array of `{ id, name, email, institution, role, purpose, status, createdAt }`. Omit `status` to list all.

### `POST /api/auth/access-requests/:id/approve` — admin only

Creates the `User` account and marks the request approved.
**200** `{ "user": { "id", "name", "email", "institution", "role" }, "temporaryPassword": "..." }`
**404** — request doesn't exist. **409** — already approved/rejected, or a user with that email already exists.

`temporaryPassword` is a random one-time password for the admin to relay to
the applicant themselves (by whatever channel) — there's no email/invite
service in this stack yet to send it automatically. Revisit once one exists.

### `POST /api/auth/access-requests/:id/reject` — admin only

**204**. **404**/**409** as above.

## CO₂ ANN Forecast

Merged into Module A: CO₂ is now a gas option alongside SO₂/CH₄, using the
same coordinate + buffer-radius input (no file uploads). The analysis-service
fetches CO₂ and weather data from satellite for the given site/window itself
— simulated for now, see `analysis-service/src/satellite/simulate.py` — then
runs the existing LSTM-GRU + SARIMA pipeline unchanged.

### `POST /api/co2-ann/analyze`

application/json:

| field | type | required |
|---|---|---|
| `latitude` | number | yes |
| `longitude` | number | yes |
| `radiusKm` | number, > 0 | yes |
| `startDate` | string, `YYYY-MM-DD` | no — defaults to a ~400-day lookback ending today/`endDate` |
| `endDate` | string, `YYYY-MM-DD` | no — defaults to today |

**202 Accepted**
```json
{ "jobId": "66f1a2b3c4d5e6f7a8b9c0d1" }
```

**400** — `latitude`/`longitude`/`radiusKm` missing, not numeric, or `radiusKm <= 0`.

### `GET /api/co2-ann/jobs/:jobId`

**200**, one of:
```json
{ "stage": "queued" }
{ "stage": "running", "startedAt": 1735500000000 }
{
  "stage": "complete",
  "startedAt": 1735500000000,
  "result": {
    "timeSeries": {
      "dates": ["2023-05", "2023-06", "..."],
      "actual": [412, 415, "..."],
      "ann": [411, 416, "..."],
      "sarima": [410, 413, "..."]
    },
    "correlations": [
      { "feature": "Temperature", "r": 0.62 },
      { "feature": "Wind Speed", "r": -0.34 }
    ]
  }
}
{ "stage": "failed", "startedAt": 1735500000000, "error": "..." }
```

**404** — job doesn't exist or doesn't belong to the caller.

Matches `Co2AnnResult` (`app/src/models/co2ann.types.ts`) exactly — the two
confirmed outputs are `timeSeries` (actual vs. ANN vs. SARIMA line chart)
and `correlations` (Pearson correlation bar chart).

## AERMOD Dispersion

### `POST /api/dispersion/analyze`

multipart/form-data:

| field | type | required |
|---|---|---|
| `metData` | CSV/TSV/XLSX/XLS — cloud cover, temp, RH, pressure, wind | yes |
| `CO2` | CSV/TSV/XLSX/XLS — source ID, X/Y, emission rate | at least one of CO2/CH4/H2S |
| `CH4` | same shape | — |
| `H2S` | same shape | — |

**202 Accepted**
```json
{ "jobId": "66f1a2b3c4d5e6f7a8b9c0d2" }
```

**400** — missing `metData`, or no gas file attached at all.

### `GET /api/dispersion/jobs/:jobId`

**200**, one of:
```json
{ "stage": "queued" }
{ "stage": "running", "startedAt": 1735500000000 }
{
  "stage": "complete",
  "startedAt": 1735500000000,
  "result": [
    {
      "gas": "CO2",
      "fields": [
        { "window": "1hr", "geojson": { "...": "FeatureCollection" }, "unit": "µg m⁻³" },
        { "window": "8hr", "geojson": "...", "unit": "µg m⁻³" },
        { "window": "24hr", "geojson": "...", "unit": "µg m⁻³" },
        { "window": "monthly", "geojson": "...", "unit": "µg m⁻³" }
      ],
      "diurnalByReceptor": {
        "R1": [{ "hour": 0, "concentrationNorm": 0.12, "windSpeedNorm": 0.4 }, "..."],
        "R2": ["..."], "R3": ["..."], "R4": ["..."]
      }
    }
  ]
}
{ "stage": "failed", "startedAt": 1735500000000, "error": "..." }
```

`result` only contains entries for gases whose emission-source file was
uploaded (up to 3). Matches `DispersionResult[]`
(`app/src/models/dispersion.types.ts`) exactly — 5 outputs per gas: 4
spatial fields (1hr/8hr/24hr/monthly contour GeoJSON) + 1 diurnal-vs-receptor
series.

`geojson` is currently `null` in both the frontend simulation and the
server's simulated fallback (`services/analysisServiceClient.ts`) — it
becomes a real `FeatureCollection` once the analysis-service exports
`geojsoncontour` output for real receptor data (AERMODfinal.ipynb, still
pending re-upload).

## What's still open

- **The analysis-service boundary itself.** `services/analysisServiceClient.ts`
  is the one file that calls into the Python side, and its request/response
  shape there is a placeholder — that contract needs to be worked out with
  the analysis team, not just assumed. Until `ANALYSIS_SERVICE_URL` is set,
  both workers run against the same synthetic data the frontend simulates,
  so the rest of the stack (upload → queue → worker → Mongo → poll → UI) is
  fully exercisable without it.
- **Module A (SO₂/CH₄ satellite)** — still frontend-simulated only; no
  server route exists for SO₂/CH₄ yet (unlike CO₂, which now has a real
  analysis-service pipeline behind it). Whether SO₂/CH₄ get a real backend,
  and whether that stays coordinate-driven or moves to uploads, is still
  open per the project notes.
- **CO₂ ANN's satellite dataset** — simulated pending a decision with the
  analysis team on which real GEE collection to use for CO₂ (TROPOMI, used
  for SO₂/CH₄, doesn't resolve CO₂ well). One function to swap once decided:
  `analysis-service/src/satellite/simulate.py`'s `fetch_satellite_co2_series`.
