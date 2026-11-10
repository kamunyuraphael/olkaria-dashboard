"""
Per-gas orchestration - wires sources + met + receptors + the right engine
through to the 5 outputs (4 spatial fields + 1 diurnal series) each gas
needs. This is the module that encodes which engine/grid/calibration each
(gas, window) pair uses, per the "match the analysis team's notebook
exactly" decision - see config.py and each dispersion/* module's
docstrings for where each number traces back to.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from src.config import (
    CH4_CALIBRATION_TARGET_MAX,
    CH4_DISPLAY_GRID_BUFFER_FRACTION,
    CH4_DISPLAY_GRID_POINTS,
    CH4_SMOOTHING_SIGMA,
    CO2_1HR_CONTOUR_LEVELS,
    CO2_1HR_GRID_POINTS,
    CO2_CALIBRATION_TARGET_MAX,
    CO2_DISPLAY_GRID_BUFFER_M,
    CO2_DISPLAY_GRID_POINTS,
    CO2_SMOOTHING_SIGMA,
    H2S_CALIBRATION_TARGET_MAX,
    H2S_DISPLAY_GRID_BUFFER_FRACTION,
    H2S_DISPLAY_GRID_POINTS,
    H2S_SMOOTHING_SIGMA,
    SOURCE_COLUMNS,
)
from src.dispersion import diurnal as diurnal_mod
from src.dispersion.fields import (
    build_spatial_field,
    ch4_monthly_highest_month,
    co2_monthly_mean_across_months,
    field_to_geojson,
    h2s_monthly_from_rolling,
    max_1hr,
    max_8hr,
    max_24hr,
    run_hourly_full,
    run_hourly_simple,
    run_hourly_terrain,
)
from src.dispersion.receptors import build_h2s_grid, build_main_grid, interpolate_terrain
from src.dispersion.sources import expand_sources, prepare_sources

WINDOWS = ["1hr", "8hr", "24hr", "monthly"]
UNIT = "µg m⁻³"


def _buffered_grid(x: np.ndarray, y: np.ndarray, points: int, *, buffer_m: float = 0, buffer_fraction: float = 0) -> tuple[np.ndarray, np.ndarray]:
    x_range = x.max() - x.min()
    y_range = y.max() - y.min()
    bx = buffer_m if buffer_m else buffer_fraction * x_range
    by = buffer_m if buffer_m else buffer_fraction * y_range

    grid_x = np.linspace(x.min() - bx, x.max() + bx, points)
    grid_y = np.linspace(y.min() - by, y.max() + by, points)
    return np.meshgrid(grid_x, grid_y)


def _field_result(window: str, field: np.ndarray, grid_x: np.ndarray, grid_y: np.ndarray, levels: list[float] | None = None) -> dict:
    return {"window": window, "geojson": field_to_geojson(grid_x, grid_y, field, levels), "unit": UNIT}


def run_co2(co2_sources_raw: pd.DataFrame, met: pd.DataFrame) -> dict:
    """CO2: 1hr via the terrain engine (own tight grid, no smoothing/
    calibration); 8hr/24hr via the "simple" engine (shared 151x151 display
    grid buffered 2000m around the sources); monthly via the full engine
    (same display grid); diurnal via the full engine, dynamic top-4
    receptors, full-period average, -5h cyclic shift."""
    sources = prepare_sources(co2_sources_raw)
    expanded = expand_sources(sources)
    receptors, grid_X, grid_Y = build_main_grid(sources)

    receptor_X = receptors["X"].to_numpy()
    receptor_Y = receptors["Y"].to_numpy()
    terrain_elevation = interpolate_terrain(sources, receptors)
    source_elevation = expanded["Base Elevation"].to_numpy()

    hourly_full = run_hourly_full(met, receptor_X, receptor_Y, expanded)
    hourly_terrain = run_hourly_terrain(met, receptor_X, receptor_Y, terrain_elevation, expanded, source_elevation)
    hourly_simple = run_hourly_simple(met, receptors, expanded)

    fields = []

    # 1-hour - cell 36: tight cubic grid bounded to the receptor field's own
    # range, no calibration. Smoothing is NOT from cell 36 (which leaves this
    # window raw) - see CO2_SMOOTHING_SIGMA's comment in config.py for why a
    # light gaussian pass was added here anyway, as a deliberate product
    # decision rather than notebook parity.
    values_1hr = max_1hr(hourly_terrain)
    gx, gy = np.meshgrid(
        np.linspace(receptor_X.min(), receptor_X.max(), CO2_1HR_GRID_POINTS),
        np.linspace(receptor_Y.min(), receptor_Y.max(), CO2_1HR_GRID_POINTS),
    )
    field_1hr = build_spatial_field(
        np.column_stack((receptor_X, receptor_Y)), values_1hr, gx, gy,
        smoothing_sigma=CO2_SMOOTHING_SIGMA["1hr"], calibration_target_max=None,
    )
    fields.append(_field_result("1hr", field_1hr, gx, gy, levels=CO2_1HR_CONTOUR_LEVELS))

    # 8hr / 24hr - cells 57-66: shared 151x151 grid, +/-2000m around source bounds
    source_x = sources[SOURCE_COLUMNS["x"]].to_numpy()
    source_y = sources[SOURCE_COLUMNS["y"]].to_numpy()
    dgx, dgy = _buffered_grid(source_x, source_y, CO2_DISPLAY_GRID_POINTS, buffer_m=CO2_DISPLAY_GRID_BUFFER_M)

    for window, values in [("8hr", max_8hr(hourly_simple)), ("24hr", max_24hr(hourly_simple))]:
        field = build_spatial_field(
            np.column_stack((receptor_X, receptor_Y)), values, dgx, dgy,
            smoothing_sigma=CO2_SMOOTHING_SIGMA[window], calibration_target_max=CO2_CALIBRATION_TARGET_MAX[window],
        )
        fields.append(_field_result(window, field, dgx, dgy))

    # monthly - cells 67-73: full engine, same display grid
    monthly_values = co2_monthly_mean_across_months(hourly_full)
    field_monthly = build_spatial_field(
        np.column_stack((receptor_X, receptor_Y)), monthly_values, dgx, dgy,
        smoothing_sigma=CO2_SMOOTHING_SIGMA["monthly"], calibration_target_max=CO2_CALIBRATION_TARGET_MAX["monthly"],
    )
    fields.append(_field_result("monthly", field_monthly, dgx, dgy))

    diurnal = diurnal_mod.co2_diurnal(met, hourly_full)

    return {"fields": fields, "diurnalByReceptor": diurnal}


def run_ch4(ch4_sources_raw: pd.DataFrame, met: pd.DataFrame, main_receptors: pd.DataFrame, main_grid_X: np.ndarray, main_grid_Y: np.ndarray) -> dict:
    """CH4: full engine for everything, reusing CO2's main 21x21 grid, its
    own expanded display grid (buffer_fraction=0.25), and a per-window
    calibration target. Monthly uses a different definition from CO2
    (picks the single highest-concentration month, not an average)."""
    sources = prepare_sources(ch4_sources_raw)
    expanded = expand_sources(sources)

    receptor_X = main_receptors["X"].to_numpy()
    receptor_Y = main_receptors["Y"].to_numpy()

    hourly_full = run_hourly_full(met, receptor_X, receptor_Y, expanded)

    dgx, dgy = _buffered_grid(receptor_X, receptor_Y, CH4_DISPLAY_GRID_POINTS, buffer_fraction=CH4_DISPLAY_GRID_BUFFER_FRACTION)

    window_values = {
        "1hr": max_1hr(hourly_full),
        "8hr": max_8hr(hourly_full),
        "24hr": max_24hr(hourly_full),
        "monthly": ch4_monthly_highest_month(hourly_full, met["Datetime"]),
    }

    fields = []
    for window in WINDOWS:
        field = build_spatial_field(
            np.column_stack((receptor_X, receptor_Y)), window_values[window], dgx, dgy,
            smoothing_sigma=CH4_SMOOTHING_SIGMA[window], calibration_target_max=CH4_CALIBRATION_TARGET_MAX[window],
        )
        fields.append(_field_result(window, field, dgx, dgy))

    diurnal = diurnal_mod.ch4_diurnal(met, hourly_full)

    return {"fields": fields, "diurnalByReceptor": diurnal}


def run_h2s(h2s_sources_raw: pd.DataFrame, met: pd.DataFrame, main_grid_X: np.ndarray, main_grid_Y: np.ndarray) -> dict:
    """H2S: full engine, but on its OWN wider 51x51 receptor grid (sized
    to its own source spread) and its own display grid. Monthly uses yet
    another definition (max over the first 3 of 4 resampled months).
    Diurnal reuses CH4's hardcoded receptor indices but as coordinates
    into the MAIN grid, then reruns a fresh 4-point simulation."""
    sources = prepare_sources(h2s_sources_raw)
    expanded = expand_sources(sources)
    h2s_receptors = build_h2s_grid(sources)

    receptor_X = h2s_receptors["X"].to_numpy()
    receptor_Y = h2s_receptors["Y"].to_numpy()

    hourly_full = run_hourly_full(met, receptor_X, receptor_Y, expanded)

    dgx, dgy = _buffered_grid(receptor_X, receptor_Y, H2S_DISPLAY_GRID_POINTS, buffer_fraction=H2S_DISPLAY_GRID_BUFFER_FRACTION)

    window_values = {
        "1hr": max_1hr(hourly_full),
        "8hr": max_8hr(hourly_full),
        "24hr": max_24hr(hourly_full),
        "monthly": h2s_monthly_from_rolling(hourly_full),
    }

    fields = []
    for window in WINDOWS:
        field = build_spatial_field(
            np.column_stack((receptor_X, receptor_Y)), window_values[window], dgx, dgy,
            smoothing_sigma=H2S_SMOOTHING_SIGMA, calibration_target_max=H2S_CALIBRATION_TARGET_MAX[window],
        )
        fields.append(_field_result(window, field, dgx, dgy))

    diurnal = diurnal_mod.h2s_diurnal(met, main_grid_X, main_grid_Y, expanded)

    return {"fields": fields, "diurnalByReceptor": diurnal}
