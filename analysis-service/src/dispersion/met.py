"""Meteorological preprocessing - ports notebook cells 8-9 exactly."""

from __future__ import annotations

import pandas as pd

from src.config import MET_COLUMNS, STABILITY_MIXING_HEIGHT_M, STABILITY_MONIN_OBUKHOV_LENGTH_M
from src.io_utils import require_columns


def _assign_stability(cloud_oktas: float) -> str:
    """Cell 9's assign_stability - Pasquill-style class from cloud cover."""
    if cloud_oktas <= 2:
        return "A"
    if cloud_oktas <= 4:
        return "B"
    if cloud_oktas <= 6:
        return "C"
    return "D"


def preprocess_met(met: pd.DataFrame) -> pd.DataFrame:
    """Cells 8-9: unit conversion, datetime construction, AERMET-like
    boundary-layer parameters. Returns a new dataframe; does not mutate
    the input."""
    require_columns(
        met,
        [
            MET_COLUMNS["year"], MET_COLUMNS["month"], MET_COLUMNS["day"], MET_COLUMNS["hour"],
            MET_COLUMNS["cloud_cover"], MET_COLUMNS["wind_speed_kmh"], MET_COLUMNS["wind_direction_deg"],
        ],
        context="Meteorological data",
    )

    met = met.copy()

    # Cell 8: km/h -> m/s, wind direction into [0, 360), zero wind speeds
    # replaced to avoid division-by-zero in the plume equation downstream.
    met["Wind Speed (m/s)"] = met[MET_COLUMNS["wind_speed_kmh"]] * 0.277778
    met["Wind Direction (°)"] = met[MET_COLUMNS["wind_direction_deg"]] % 360
    met["Wind Speed (m/s)"] = met["Wind Speed (m/s)"].replace(0, 0.1)

    met["Datetime"] = pd.to_datetime(
        dict(
            year=met[MET_COLUMNS["year"]] + 2000,
            month=met[MET_COLUMNS["month"]],
            day=met[MET_COLUMNS["day"]],
            hour=met[MET_COLUMNS["hour"]],
        )
    )

    # Cell 9: stability class + friction velocity + mixing height + MOL
    met["Stability"] = met[MET_COLUMNS["cloud_cover"]].apply(_assign_stability)
    met["Friction Velocity (m/s)"] = 0.1 * met["Wind Speed (m/s)"]
    met["Mixing Height (m)"] = met["Stability"].map(STABILITY_MIXING_HEIGHT_M)
    met["Monin Obukhov Length (m)"] = met["Stability"].map(STABILITY_MONIN_OBUKHOV_LENGTH_M)

    return met
