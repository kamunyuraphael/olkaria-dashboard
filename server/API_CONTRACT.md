# API contract - CO₂ ANN + AERMOD Dispersion

Both modules are real async jobs, not synchronous requests. Confirmed real
runtimes from the analysis team: **CO₂ ANN ~3 minutes**, **AERMOD dispersion
~8-10 minutes** - both too long to hold an HTTP request/response open, so
each endpoint follows the same submit → poll shape: `POST /analyze` starts
the job and returns a `jobId`, `GET /jobs/:jobId` is polled until it resolves.

All routes require `Authorization: Bearer <token>` (see `middleware/auth.middleware.ts`).
AERMOD dispersion's frontend polling goes through the `useUploadAnalysis` hook
(`app/src/controllers/useUploadAnalysis.ts`), 4s interval, `jobId` persisted to
`sessionStorage` so a refresh mid-run reattaches instead of losing the job.
CO₂ ANN merged into Module A's coordinate-driven flow (`useAnalysisJob.ts`) -
see that section below for its own request shape.

## Supported file formats (AERMOD dispersion only)

Every upload field on the dispersion module accepts **CSV, TSV, or Excel
(.xlsx/.xls)** - the constant lives in one place on each side
(`app/src/lib/fileFormats.ts`, `server/src/middleware/upload.middleware.ts`'s
`ALLOWED_EXTENSIONS`), so widening or narrowing the set later is a one-line
change, not a hunt through every field. CO₂ ANN no longer uploads files (see
below), so this section now applies to dispersion alone.

**Why this set and not more:** CSV/TSV/XLSX/XLS covers everything
`pandas.read_csv`/`read_excel` handle natively, and it's the full range of
what a researcher's instrument export or Excel workbook actually arrives
as. JSON, Parquet, etc. were deliberately left out - nothing in the CO₂ ANN
or AERMOD notebooks produces or expects them, and adding them would mean a
second parsing path in the analysis-service for no current benefit. Add
them in both places above if that ever changes.

**Why validation happens in three places, not one:**
1. **`FileSlot.tsx`, client-side** - checks the dropped/selected file's
   extension against the same allowlist before it's even added to state.
   This exists purely for instant feedback; the HTML `accept` attribute
   alone only filters the native picker dialog, it does nothing for
   drag-and-drop and nothing server-side, so relying on it alone would mean
   a drag-dropped `.docx` sails through with no warning until the job fails
   minutes later.
2. **`upload.middleware.ts`, server-side, by extension** - rejects an
   obviously-wrong upload with a clean `400` before a job is ever created,
   so a bad upload doesn't consume a queue slot or an analysis-service call.
   This is **not real validation** - a file extension is just a name,
   trivially spoofed - it's a cheap first filter.
3. **The analysis-service, by content, when it actually parses the file**
   - this is the only check that can't be faked, and it's unavoidable: even
   a `.csv`-named file can be garbage. A parse failure here throws inside
   the worker, which marks the job `failed` with a readable
   `failureReason`; `GET /jobs/:jobId` returns that as `{stage: "failed",
   error}`, which the frontend already renders in its "Analysis failed"
   state. No separate error-reporting path needed - job failure IS the
   error-reporting path.

None of the three layers alone is sufficient (client-side is bypassable,
extension-based is spoofable), and content-based parsing alone is
sufficient but slow to surface (a multi-minute job runs before the user
learns their file was junk). Layering them means most mistakes are caught
in under a second, and the rest are still caught correctly, just later.

## Auth

No self-service signup. Every account is created by an admin approving a
pending access request - each analysis run has a real compute cost (3-10
minutes against the analysis-service), so access is gated rather than open.
The very first admin account comes from `npm run seed:admin`
(`src/scripts/seedAdmin.ts`), not from this API.

### `POST /api/auth/login`

```json
{ "email": "...", "password": "..." }
```
**200** `{ "token": "<jwt>", "user": { "id", "name", "email", "institution", "role" } }`
**401** - wrong email/password (deliberately the same message either way, so the response doesn't reveal whether an email is registered).

### `POST /api/auth/request-access`

```json
{ "name": "...", "email": "...", "institution": "...", "role": "researcher" | "policy", "purpose": "..." }
```
**201** `{ "id": "...", "status": "pending" }`
**400** - a required field is missing or `role` isn't `researcher`/`policy`.

### `GET /api/auth/me`

Restores a session from a stored token (e.g. after a page refresh) rather
than trusting stale client-side data.
**200** `{ "user": { "id", "name", "email", "institution", "role" } }`
**401** - missing/invalid/expired token. **404** - token is valid but the user no longer exists.

### `POST /api/auth/logout`

**204**. JWTs are stateless, so there's no server-side session to clear -
this exists for the frontend to call on sign-out; the actual logout is the
client discarding its token.

### `GET /api/auth/access-requests?status=pending` - admin only

**200** - array of `{ id, name, email, institution, role, purpose, status, createdAt }`. Omit `status` to list all.

### `POST /api/auth/access-requests/:id/approve` - admin only

Creates the `User` account and marks the request approved.
**200** `{ "user": { "id", "name", "email", "institution", "role" }, "temporaryPassword": "..." }`
**404** - request doesn't exist. **409** - already approved/rejected, or a user with that email already exists.

`temporaryPassword` is a random one-time password for the admin to relay to
the applicant themselves (by whatever channel) - there's no email/invite
service in this stack yet to send it automatically. Revisit once one exists.

### `POST /api/auth/access-requests/:id/reject` - admin only

**204**. **404**/**409** as above.

## Satellite ANN Forecast (SO₂ / CH₄ / CO₂)

Module A. All three gases share one real async pipeline and the same
coordinate + buffer-radius input (no file uploads). The analysis-service
fetches the requested gas and weather data from satellite for the given
site/window itself - simulated per gas for now, see
`analysis-service/src/satellite/simulate.py` - then runs the LSTM-GRU +
SARIMA pipeline (`analysis-service/src/satellite_ann/pipeline.py`). Routes
and the queue keep the historical `co2-ann` name.

### `POST /api/co2-ann/analyze`

application/json:

| field | type | required |
|---|---|---|
| `gas` | `"SO2"` \| `"CH4"` \| `"CO2"` | no - defaults to `"CO2"` |
| `latitude` | number | yes |
| `longitude` | number | yes |
| `radiusKm` | number, > 0 | yes |
| `startDate` | string, `YYYY-MM-DD` | no - defaults to a ~400-day lookback ending today/`endDate` |
| `endDate` | string, `YYYY-MM-DD` | no - defaults to today |

**202 Accepted**
```json
{ "jobId": "66f1a2b3c4d5e6f7a8b9c0d1" }
```

**400** - `gas` isn't one of SO2/CH4/CO2, `latitude`/`longitude`/`radiusKm` missing or not numeric, or `radiusKm <= 0`.

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

**404** - job doesn't exist or doesn't belong to the caller.

Matches `Co2AnnResult` (`app/src/models/co2ann.types.ts`) exactly - the two
confirmed outputs are `timeSeries` (actual vs. ANN vs. SARIMA line chart)
and `correlations` (Pearson correlation bar chart).

## AERMOD Dispersion

### `POST /api/dispersion/analyze`

multipart/form-data:

| field | type | required |
|---|---|---|
| `metData` | CSV/TSV/XLSX/XLS - cloud cover, temp, RH, pressure, wind | yes |
| `CO2` | CSV/TSV/XLSX/XLS - source ID, X/Y, emission rate | at least one of CO2/CH4/H2S |
| `CH4` | same shape | - |
| `H2S` | same shape | - |

**202 Accepted**
```json
{ "jobId": "66f1a2b3c4d5e6f7a8b9c0d2" }
```

**400** - missing `metData`, or no gas file attached at all.

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
(`app/src/models/dispersion.types.ts`) exactly - 5 outputs per gas: 4
spatial fields (1hr/8hr/24hr/monthly contour GeoJSON) + 1 diurnal-vs-receptor
series.

`geojson` is currently `null` in both the frontend simulation and the
server's simulated fallback (`services/analysisServiceClient.ts`) - it
becomes a real `FeatureCollection` once the analysis-service exports
`geojsoncontour` output for real receptor data (AERMODfinal.ipynb, still
pending re-upload).

## What's still open

- **The analysis-service boundary itself.** `services/analysisServiceClient.ts`
  is the one file that calls into the Python side, and its request/response
  shape there is a placeholder - that contract needs to be worked out with
  the analysis team, not just assumed. Until `ANALYSIS_SERVICE_URL` is set,
  both workers run against the same synthetic data the frontend simulates,
  so the rest of the stack (upload → queue → worker → Mongo → poll → UI) is
  fully exercisable without it.
- **Satellite datasets** - all three gases are simulated pending a decision
  with the analysis team on real GEE collections (TROPOMI suits SO₂/CH₄ but
  doesn't resolve CO₂ well). One function to swap:
  `analysis-service/src/satellite/simulate.py`'s `fetch_satellite_series`.
- **Real result charts on the New Analysis page** - the page still renders
  placeholder charts; the real `timeSeries`/`correlations` payload is now
  returned for every gas but not yet plotted.

---

## Upload-based ANN run: `POST /api/co2-ann/analyze-upload`

Alternative to the coordinate/satellite route. Same queue, worker, job polling
(`GET /api/co2-ann/jobs/:jobId`) and result shape; only the data source differs.

- **Auth:** Bearer token (same as every route).
- **Body:** `multipart/form-data`
  - `gas` - `"SO2" | "CH4" | "CO2"` (required)
  - `data` - ONE combined file: csv / tsv / xlsx / xls (required, max 25 MB)
  - `label` - free-text site/dataset label (optional, max 120 chars)
- **Columns** (case-insensitive; common aliases such as `temp`, `wind_speed`, `rain` accepted):
  `date`, the gas column (`so2` / `ch4` / `co2`), `temperature`, `ws`, `pressure`, `precipitation`.
- **Time resolution is detected, not assumed:** finer than daily is averaged to daily;
  daily gaps up to 20% are filled by time interpolation; coarser than daily
  (weekly/monthly) is rejected; fewer than 206 daily records is rejected.
- **Response:** `202 { jobId }`.
- **Result** gains `meta`: `{ source: "upload", gas, label?, rows, startDate, endDate,
  detectedStep, resampledToDaily, filledDays }` (satellite runs: `{ source: "satellite", gas, rows }`).
- **Validation failures** (bad columns, too short, monthly data...) fail the job
  immediately without retries; `GET /jobs/:id` returns `{ stage: "failed", error: "<readable reason>" }`.

Analysis-service counterpart: `POST /co2-ann/analyze-upload` (multipart: `gas`, `data`);
422 responses carry `{ detail }` with the readable reason.

## Added: jobs list + default location

- `GET /api/jobs?stage=&module=&limit=` (auth) → `{ counts: {total,queued,running,complete,failed}, jobs: [{id,module,stage,dataSource,gas,gases,label,coordinates,error,createdAt,completedAt}] }`. Own jobs only, newest first, no result payloads. Open a finished run via `GET /api/co2-ann/jobs/:id` or `GET /api/dispersion/jobs/:id`.
- `PATCH /api/auth/me/location` (auth) body `{latitude, longitude, label?}` or `{clear:true}` → `{ user }`. `user.defaultLocation` (`{label?,latitude,longitude}` or `null`) is also returned by `/login` and `/me`.

## Added: account management

- Every authenticated call re-checks the user in Mongo: deleted → 401, disabled → 403, role changes apply immediately.
- `POST /api/auth/change-password` `{currentPassword,newPassword(>=8)}` → `{user}`; clears `mustChangePassword`.
- `DELETE /api/auth/me` `{password}` → 204; removes the account, its runs, results and uploaded files (refused for the only active admin).
- `user.mustChangePassword` is true after approval or an admin reset (temporary password).
- Admin: `GET /api/users`, `PATCH /api/users/:id` `{role?,disabled?}`, `POST /api/users/:id/reset-password` → `{temporaryPassword}`, `DELETE /api/users/:id` (hard delete incl. data). The last active admin can't be demoted, disabled or deleted.
- `DELETE /api/jobs/:id` removes one of your own finished/failed runs and its output.
- `POST /api/auth/login` is limited to 10 attempts / 15 min per IP + email (429).

## Added: stop + bulk delete
- `POST /api/jobs/:id/cancel` - stops a queued/running run → stage `cancelled` (`409` if already finished). The worker aborts its request to the analysis-service within ~2 s; the analysis-service may keep computing in the background but its result is discarded.
- `DELETE /api/jobs?stage=failed` - deletes all of the caller's failed **and stopped** runs → `{deleted}`.
- Job stage `cancelled` appears in `/api/jobs` (`counts.cancelled`) and the per-module GET endpoints (`{stage:"cancelled", error:"Stopped by you."}`).

## Emailed temporary passwords (optional)
`POST /api/auth/access-requests/:id/approve` and `POST /api/users/:id/reset-password` now also return `emailed: boolean`.
Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` to enable; otherwise `emailed` is `false` and the admin shares the password manually.

## Background mode (analysis-service)
`POST /co2-ann/analyze`, `/co2-ann/analyze-upload` and `/dispersion/analyze-upload` accept `?background=true`.
They then return `{ "jobId" }` immediately; poll `GET /jobs/{id}` → `{state:"running"}` | `{state:"done",result}` | `{state:"error",status,detail}`.
Unknown id → 404 (service restarted). Results are kept in memory for 1 hour. Without the flag the endpoints behave as before; the Node client falls back to the direct response if an older service ignores the flag.
