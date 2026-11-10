# Olkaria Gas Dashboard

Full-stack dashboard for gas monitoring and analysis around Olkaria. The
project contains a React frontend, a Node.js API/job worker, and a Python
analysis service.

## Components

- **`app/`** — React 19, TypeScript, and Vite frontend. Includes the SO2/CH4
  satellite interface, CO2 ANN analysis, and AERMOD dispersion results.
- **`server/`** — Express/TypeScript API, MongoDB persistence, and BullMQ
  workers backed by Redis. See [the API contract](server/API_CONTRACT.md).
- **`analysis-service/`** — FastAPI service for satellite ANN and dispersion
  calculations; can be run locally or built using its Dockerfile.
- **`render.yaml`** — Render Blueprint for the API service.

## Requirements

- Node.js 20.19+ or 22.12+, with npm
- Python 3.11 for the analysis service
- MongoDB and Redis for the API and background jobs

## Local development

Start each component in its own terminal. From the repository root:

1. **Start MongoDB and Redis** and ensure they are reachable at the values
   configured in `server/.env`.
2. **Configure and start the API**:

   ```powershell
   cd server
   Copy-Item .env.example .env
   npm ci
   npm run dev
   ```

   Set `ANALYSIS_SERVICE_URL=http://localhost:8000` in `server/.env`.
   The API listens on port 4000 by default.
3. **Start the analysis service**:

   ```powershell
   cd analysis-service
   py -3.11 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Start the frontend**:

   ```powershell
   cd app
   npm ci
   npm run dev
   ```

   Open the Vite URL shown in the terminal (normally
   `http://localhost:5173`). Leave `VITE_API_BASE_URL` empty for local
   development so Vite can proxy API requests to `localhost:4000`.

Run the job worker separately during local development:

```powershell
cd server
npm run worker
```

To create the first administrator, set `ADMIN_EMAIL` and `ADMIN_PASSWORD`
in the current PowerShell session and run `npm run seed:admin` from `server/`.
Do not put the administrator password in a committed file.

## Deployment

Deploy `app/` as a Vercel project and set `VITE_API_BASE_URL` to the public
API origin. The Render Blueprint in `render.yaml` deploys `server/` with
workers running in the API process. Configure its MongoDB, Redis, frontend
origin, analysis-service URL, and service token values in the hosting
provider; do not commit production credentials. Deploy `analysis-service/`
as a separate service using its Dockerfile and set the matching
`ANALYSIS_SERVICE_TOKEN` on both services.

## Before publishing

- Keep `.env` and other local environment files out of Git. Only the
  `.env.example` templates belong in the repository.
- Treat any credentials already stored in local environment files as
  exposed: rotate them before using or publishing the project.
- Review files containing research data or uploaded user files before adding
  them; do not publish private or identifying data.
- Review the deployment URLs and environment-variable values for your own
  hosting accounts before deploying.
