"""
FastAPI app - the HTTP boundary server/src/services/analysisServiceClient.ts
calls into. Two endpoints, matching server/API_CONTRACT.md exactly:
POST /dispersion/analyze and POST /co2-ann/analyze.
"""

from __future__ import annotations

import logging
import os
import shutil
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from src.satellite_ann.pipeline import SUPPORTED_GASES, run_satellite_ann, run_uploaded_ann
from src.dispersion.met import preprocess_met
from src.dispersion.pipeline import run_ch4, run_co2, run_h2s
from src.dispersion.receptors import build_main_grid
from src.dispersion.sources import prepare_sources
from src.io_utils import UnreadableFileError, load_tabular

logger = logging.getLogger("analysis-service")
app = FastAPI(title="Olkaria analysis-service")

# Optional shared secret. When ANALYSIS_SERVICE_TOKEN is set (do this on any
# public host), every route except /health requires a matching
# `X-Service-Token` header - the Node server sends it from its own
# ANALYSIS_SERVICE_TOKEN. Unset locally, so dev needs no extra setup.
_SERVICE_TOKEN = os.environ.get("ANALYSIS_SERVICE_TOKEN")


@app.middleware("http")
async def require_service_token(request: Request, call_next):
    if _SERVICE_TOKEN and request.url.path.startswith(("/co2-ann", "/dispersion")):
        if request.headers.get("x-service-token") != _SERVICE_TOKEN:
            return JSONResponse({"detail": "Invalid or missing service token."}, status_code=401)
    return await call_next(request)


class Co2AnnRequest(BaseModel):
    # Module A satellite ANN serves SO2, CH4 and CO2 through this one route
    # (path kept as /co2-ann/analyze so the server client needn't change).
    # Defaults to CO2 so older callers that don't send `gas` still work.
    gas: str = "CO2"
    latitude: float
    longitude: float
    radiusKm: float
    startDate: str | None = None
    endDate: str | None = None


class DispersionRequest(BaseModel):
    metDataPath: str
    emissionSourcePaths: dict[str, str]  # keys: "CO2" | "CH4" | "H2S", any subset


@app.post("/co2-ann/analyze")
def co2_ann_analyze(req: Co2AnnRequest):
    if req.gas not in SUPPORTED_GASES:
        raise HTTPException(status_code=422, detail=f"Unsupported gas {req.gas!r}; expected one of {list(SUPPORTED_GASES)}.")
    try:
        return run_satellite_ann(req.gas, req.latitude, req.longitude, req.radiusKm, req.startDate, req.endDate)
    except UnreadableFileError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("co2-ann analysis failed")
        raise HTTPException(status_code=500, detail=f"co2-ann analysis failed: {exc}") from exc


def _run_dispersion(met_raw, gas_sources: dict):
    """Shared by both dispersion endpoints: everything after the files have
    been parsed into dataframes."""
    met = preprocess_met(met_raw)

    # The main 21x21 grid (shared by CO2/CH4, and the coordinate space
    # H2S's diurnal receptor indices are defined against - see cell 124)
    # is built from CO2's source positions in the notebook. CO2 isn't
    # guaranteed to be uploaded in every job, so fall back to whichever
    # gas IS present. If only H2S was uploaded, its diurnal R1-R4 are
    # built against H2S's own source bounds instead - not what the
    # notebook does (it never ran H2S alone), but the closest faithful
    # fallback rather than failing the whole job.
    grid_basis = gas_sources["CO2"] if "CO2" in gas_sources else gas_sources["CH4"] if "CH4" in gas_sources else next(iter(gas_sources.values()))
    main_receptors, main_grid_X, main_grid_Y = build_main_grid(prepare_sources(grid_basis))

    results = []
    if "CO2" in gas_sources:
        out = run_co2(gas_sources["CO2"], met)
        results.append({"gas": "CO2", **out})
    if "CH4" in gas_sources:
        out = run_ch4(gas_sources["CH4"], met, main_receptors, main_grid_X, main_grid_Y)
        results.append({"gas": "CH4", **out})
    if "H2S" in gas_sources:
        out = run_h2s(gas_sources["H2S"], met, main_grid_X, main_grid_Y)
        results.append({"gas": "H2S", **out})
    return results


@app.post("/dispersion/analyze")
def dispersion_analyze(req: DispersionRequest):
    """Local/dev mode: the files already sit on this machine's disk."""
    try:
        met_raw = load_tabular(req.metDataPath)
        gas_sources = {gas: load_tabular(path) for gas, path in req.emissionSourcePaths.items()}
        return _run_dispersion(met_raw, gas_sources)
    except UnreadableFileError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("dispersion analysis failed")
        raise HTTPException(status_code=500, detail=f"dispersion analysis failed: {exc}") from exc


@app.post("/dispersion/analyze-upload")
def dispersion_analyze_upload(
    metData: UploadFile = File(...),
    CO2: UploadFile | None = File(None),
    CH4: UploadFile | None = File(None),
    H2S: UploadFile | None = File(None),
):
    """Remote mode: the API server and this service run on different hosts
    (no shared disk), so the files arrive as a multipart upload instead of
    paths. Same computation as /dispersion/analyze."""
    tmp = Path(tempfile.mkdtemp(prefix="dispersion-"))
    try:
        def save(upload: UploadFile, label: str) -> Path:
            suffix = Path(upload.filename or "").suffix or ".csv"
            dest = tmp / f"{label}{suffix}"
            with dest.open("wb") as fh:
                shutil.copyfileobj(upload.file, fh)
            return dest

        met_raw = load_tabular(save(metData, "metData"))
        gas_sources = {
            gas: load_tabular(save(up, gas))
            for gas, up in (("CO2", CO2), ("CH4", CH4), ("H2S", H2S))
            if up is not None
        }
        if not gas_sources:
            raise UnreadableFileError("At least one emission-source file (CO2, CH4 or H2S) is required.")
        return _run_dispersion(met_raw, gas_sources)
    except UnreadableFileError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("dispersion analysis failed")
        raise HTTPException(status_code=500, detail=f"dispersion analysis failed: {exc}") from exc
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@app.post("/co2-ann/analyze-upload")
def co2_ann_analyze_upload(gas: str = Form(...), data: UploadFile = File(...)):
    """Same forecast as /co2-ann/analyze, but fed from one combined
    user-uploaded file (date, gas reading, weather columns) instead of a
    satellite fetch. Validation problems come back as 422 with a readable
    message, which the server surfaces as the job's failure reason."""
    if gas not in SUPPORTED_GASES:
        raise HTTPException(status_code=422, detail=f"gas must be one of {list(SUPPORTED_GASES)}")
    tmp = Path(tempfile.mkdtemp(prefix="annupload-"))
    try:
        suffix = Path(data.filename or "").suffix or ".csv"
        dest = tmp / f"data{suffix}"
        with dest.open("wb") as fh:
            shutil.copyfileobj(data.file, fh)
        return run_uploaded_ann(gas, load_tabular(dest))
    except UnreadableFileError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("uploaded ANN analysis failed")
        raise HTTPException(status_code=500, detail=f"analysis failed: {exc}") from exc
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/")
def root():
    return {"service": "olkaria-analysis-service", "ok": True}
