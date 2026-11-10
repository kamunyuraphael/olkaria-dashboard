"""
PLACEHOLDER satellite data source for Module A's satellite ANN forecast
(SO2, CH4, CO2 - same pipeline, different target gas).

Team decision: Module A's satellite ANN input is just coordinates + a
buffer radius, fetched live from satellite (Earth Engine) for whichever gas
was requested. Which real GEE collection to pull each gas from is still
unsettled with the analysis team, so this generates a deterministic
synthetic daily series per gas instead of calling Earth Engine. This is the
one function to replace with a real GEE pull once datasets are chosen;
`satellite_ann_pipeline.py` only calls `fetch_satellite_series` and does
not care how the dataframe was produced.

Determinism: seeded from (gas, latitude, longitude) so repeated requests
for the same gas/site produce the same series rather than a different one
every run, which would make results feel random to a person re-running the
same query.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

from src.config import (
    SATELLITE_ANN_TARGET_COLUMN,
    SATELLITE_SIM_CH4_ANNUAL_TREND_PPB_PER_YEAR,
    SATELLITE_SIM_CH4_BASE_PPB,
    SATELLITE_SIM_CH4_NOISE_SIGMA_PPB,
    SATELLITE_SIM_CH4_SEASONAL_AMPLITUDE_PPB,
    SATELLITE_SIM_CO2_ANNUAL_TREND_PPM_PER_YEAR,
    SATELLITE_SIM_CO2_BASE_PPM,
    SATELLITE_SIM_CO2_NOISE_SIGMA_PPM,
    SATELLITE_SIM_CO2_SEASONAL_AMPLITUDE_PPM,
    SATELLITE_SIM_DEFAULT_LOOKBACK_DAYS,
    SATELLITE_SIM_PRECIPITATION_BASE_MM,
    SATELLITE_SIM_PRECIPITATION_NOISE_SIGMA_MM,
    SATELLITE_SIM_PRESSURE_BASE_HPA,
    SATELLITE_SIM_PRESSURE_NOISE_SIGMA_HPA,
    SATELLITE_SIM_SO2_BASE_UGM3,
    SATELLITE_SIM_SO2_NOISE_SIGMA_UGM3,
    SATELLITE_SIM_SO2_SEASONAL_AMPLITUDE_UGM3,
    SATELLITE_SIM_TEMPERATURE_BASE_C,
    SATELLITE_SIM_TEMPERATURE_NOISE_SIGMA_C,
    SATELLITE_SIM_TEMPERATURE_SEASONAL_AMPLITUDE_C,
    SATELLITE_SIM_WIND_SPEED_BASE_MS,
    SATELLITE_SIM_WIND_SPEED_NOISE_SIGMA_MS,
)

# Per-gas target series generator - each returns the gas column only, as a
# plain ndarray, given the shared `day_of_year`/`years_elapsed`/`rng`.
# Centralizing these three here (rather than one big if/elif in
# fetch_satellite_series) keeps adding a fourth gas to a one-function change.
_GAS_SERIES_BUILDERS = {
    "CO2": lambda day_of_year, years_elapsed, rng, n: (
        SATELLITE_SIM_CO2_BASE_PPM
        + SATELLITE_SIM_CO2_ANNUAL_TREND_PPM_PER_YEAR * years_elapsed
        + SATELLITE_SIM_CO2_SEASONAL_AMPLITUDE_PPM * np.sin(2 * np.pi * day_of_year / 365.25)
        + rng.normal(0, SATELLITE_SIM_CO2_NOISE_SIGMA_PPM, n)
    ),
    "SO2": lambda day_of_year, years_elapsed, rng, n: np.clip(
        SATELLITE_SIM_SO2_BASE_UGM3
        + SATELLITE_SIM_SO2_SEASONAL_AMPLITUDE_UGM3 * np.sin(2 * np.pi * day_of_year / 365.25)
        + rng.normal(0, SATELLITE_SIM_SO2_NOISE_SIGMA_UGM3, n),
        0,
        None,
    ),
    "CH4": lambda day_of_year, years_elapsed, rng, n: (
        SATELLITE_SIM_CH4_BASE_PPB
        + SATELLITE_SIM_CH4_ANNUAL_TREND_PPB_PER_YEAR * years_elapsed
        + SATELLITE_SIM_CH4_SEASONAL_AMPLITUDE_PPB * np.sin(2 * np.pi * day_of_year / 365.25)
        + rng.normal(0, SATELLITE_SIM_CH4_NOISE_SIGMA_PPB, n)
    ),
}


def _seed_for(gas: str, latitude: float, longitude: float) -> int:
    key = f"{gas},{round(latitude, 4)},{round(longitude, 4)}".encode()
    return int(hashlib.sha256(key).hexdigest(), 16) % (2**32)


def _date_range(start_date: str | None, end_date: str | None) -> pd.DatetimeIndex:
    if start_date and end_date:
        return pd.date_range(start=start_date, end=end_date, freq="D")
    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d")
        start = end - timedelta(days=SATELLITE_SIM_DEFAULT_LOOKBACK_DAYS)
        return pd.date_range(start=start, end=end, freq="D")
    end = datetime.utcnow()
    start = end - timedelta(days=SATELLITE_SIM_DEFAULT_LOOKBACK_DAYS)
    return pd.date_range(start=start, end=end, freq="D")


def fetch_satellite_series(
    gas: str,
    latitude: float,
    longitude: float,
    radius_km: float,
    start_date: str | None = None,
    end_date: str | None = None,
) -> pd.DataFrame:
    """Returns a daily dataframe with columns (date, <gas target column>,
    temperature, ws, pressure, precipitation) for the requested gas/site/
    window - synthetic, see module docstring. `gas` must be one of "SO2",
    "CH4", "CO2". `radius_km` doesn't change the generated values yet (a
    real GEE pull would use it to define the spatial averaging footprint);
    it's accepted now so the call signature already matches what a real
    implementation needs."""
    if gas not in _GAS_SERIES_BUILDERS:
        raise ValueError(f"Unsupported gas for satellite ANN: {gas!r}")

    rng = np.random.default_rng(_seed_for(gas, latitude, longitude))
    dates = _date_range(start_date, end_date)
    n = len(dates)
    day_of_year = dates.dayofyear.to_numpy()
    years_elapsed = (dates - dates[0]).days.to_numpy() / 365.25

    seasonal = np.sin(2 * np.pi * day_of_year / 365.25)
    target_values = _GAS_SERIES_BUILDERS[gas](day_of_year, years_elapsed, rng, n)

    temperature = (
        SATELLITE_SIM_TEMPERATURE_BASE_C
        + SATELLITE_SIM_TEMPERATURE_SEASONAL_AMPLITUDE_C * seasonal
        + rng.normal(0, SATELLITE_SIM_TEMPERATURE_NOISE_SIGMA_C, n)
    )
    ws = np.clip(
        SATELLITE_SIM_WIND_SPEED_BASE_MS + rng.normal(0, SATELLITE_SIM_WIND_SPEED_NOISE_SIGMA_MS, n),
        0.1,
        None,
    )
    pressure = SATELLITE_SIM_PRESSURE_BASE_HPA + rng.normal(0, SATELLITE_SIM_PRESSURE_NOISE_SIGMA_HPA, n)
    precipitation = np.clip(
        SATELLITE_SIM_PRECIPITATION_BASE_MM + rng.normal(0, SATELLITE_SIM_PRECIPITATION_NOISE_SIGMA_MM, n),
        0,
        None,
    )

    target_col = SATELLITE_ANN_TARGET_COLUMN[gas]
    return pd.DataFrame(
        {
            "date": dates,
            target_col: target_values,
            "temperature": temperature,
            "ws": ws,
            "pressure": pressure,
            "precipitation": precipitation,
        }
    )
