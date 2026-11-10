"""
Hourly simulation runners, temporal averaging, and the interpolate ->
smooth -> calibrate -> GeoJSON pipeline that turns a receptor-level field
into one of the 15 final outputs. Ports notebook cells 15-19, 28-32,
35-36, 46-73, 82-100, 109-123.
"""

from __future__ import annotations

import json

import geojsoncontour
import matplotlib

matplotlib.use("Agg")  # headless - this service never displays a figure, only reads contour geometry from one
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from pyproj import Transformer
from scipy.interpolate import griddata
from scipy.ndimage import gaussian_filter

from src.config import CONTOUR_FILL_OPACITY_RANGE, CONTOUR_MIN_ANGLE_DEG, UTM_EPSG, WGS84_EPSG
from src.dispersion.physics import calc_hourly_full, calc_hourly_simple, calc_hourly_terrain


def run_hourly_full(met: pd.DataFrame, receptor_X: np.ndarray, receptor_Y: np.ndarray, sources: pd.DataFrame) -> pd.DataFrame:
    """Engine #1 over every met hour. Returns a (n_hours x n_receptors)
    dataframe indexed by Datetime, columns R_0..R_{n-1} - mirrors cells 15-16 / 81 / 113."""
    source_X = sources["X"].to_numpy()
    source_Y = sources["Y"].to_numpy()
    source_Q = sources["Q"].to_numpy()
    source_height = sources["Release Height"].to_numpy()

    rows = []
    for _, met_hour in met.iterrows():
        rows.append(
            calc_hourly_full(
                receptor_X, receptor_Y, source_X, source_Y, source_Q, source_height,
                met_hour["Wind Speed (m/s)"], met_hour["Wind Direction (°)"],
                met_hour["Friction Velocity (m/s)"], met_hour["Mixing Height (m)"],
                met_hour["Monin Obukhov Length (m)"],
            )
        )

    df = pd.DataFrame(rows, columns=[f"R_{i}" for i in range(len(receptor_X))])
    df.insert(0, "Datetime", met["Datetime"].to_numpy())
    return df.set_index("Datetime")


def run_hourly_terrain(
    met: pd.DataFrame,
    receptor_X: np.ndarray,
    receptor_Y: np.ndarray,
    receptor_terrain_elevation: np.ndarray,
    sources: pd.DataFrame,
    source_elevation: np.ndarray,
) -> pd.DataFrame:
    """Engine #2 over every met hour - mirrors cells 27-29 (CO2 1-hour map only)."""
    source_X = sources["X"].to_numpy()
    source_Y = sources["Y"].to_numpy()
    source_Q = sources["Q"].to_numpy()
    source_height = sources["Release Height"].to_numpy()

    rows = []
    for _, met_hour in met.iterrows():
        rows.append(
            calc_hourly_terrain(
                receptor_X, receptor_Y, receptor_terrain_elevation, source_X, source_Y,
                source_Q, source_height, source_elevation,
                met_hour["Wind Speed (m/s)"], met_hour["Wind Direction (°)"],
                met_hour["Friction Velocity (m/s)"], met_hour["Mixing Height (m)"],
                met_hour["Monin Obukhov Length (m)"],
            )
        )

    df = pd.DataFrame(rows, columns=[f"R_{i}" for i in range(len(receptor_X))])
    df.insert(0, "Datetime", met["Datetime"].to_numpy())
    return df.set_index("Datetime")


def run_hourly_simple(met: pd.DataFrame, receptors: pd.DataFrame, sources: pd.DataFrame) -> pd.DataFrame:
    """Engine #4 over every met hour - mirrors cell 55 (CO2's 8hr/24hr 'corrected' maps)."""
    rows = []
    for _, met_hour in met.iterrows():
        rows.append(
            calc_hourly_simple(
                receptors, sources,
                met_hour["Wind Speed (m/s)"], met_hour["Wind Direction (°)"],
                met_hour["Friction Velocity (m/s)"], met_hour["Mixing Height (m)"],
                met_hour["Monin Obukhov Length (m)"],
            )
        )

    df = pd.DataFrame(rows, columns=[f"R_{i}" for i in range(len(receptors))])
    df.insert(0, "Datetime", met["Datetime"].to_numpy())
    return df.set_index("Datetime")


def max_1hr(hourly: pd.DataFrame) -> pd.Series:
    """Raw 1-hour field = the per-receptor maximum across all hours (cell 35 / 82)."""
    return hourly.max()


def max_8hr(hourly: pd.DataFrame) -> pd.Series:
    """Cells 57/86: rolling 8-hour mean, then max per receptor."""
    return hourly.rolling(window=8, min_periods=8).mean().max()


def max_24hr(hourly: pd.DataFrame) -> pd.Series:
    """Cells 62/91: rolling 24-hour mean, then max per receptor."""
    return hourly.rolling(window=24, min_periods=24).mean().max()


def co2_monthly_mean_across_months(hourly: pd.DataFrame) -> pd.Series:
    """Cell 67: CO2's monthly field = mean, per receptor, ACROSS the
    monthly-resampled means (i.e. averages the few resampled months
    together)."""
    return hourly.resample("ME").mean().mean(axis=0)


def ch4_monthly_highest_month(hourly: pd.DataFrame, met_datetime: pd.Series) -> pd.Series:
    """Cell 97: CH4's monthly field is NOT an average across months - it
    groups by calendar month, takes each receptor's mean within that
    month, then picks the single month whose peak receptor value is
    highest and returns that month's full receptor field. Genuinely
    different logic from CO2's, kept as-is per the gas-specific decision."""
    df = hourly.copy()
    df["Month_ID"] = pd.to_datetime(met_datetime.to_numpy()).to_period("M")
    monthly_fields = df.groupby("Month_ID").mean()
    highest_month = monthly_fields.max(axis=1).idxmax()
    return monthly_fields.loc[highest_month]


def h2s_monthly_from_rolling(hourly: pd.DataFrame) -> pd.Series:
    """Cell 122: H2S's monthly field = max, per receptor, across the
    first 3 resampled months only - the notebook explicitly drops the
    4th row as a "1-hour spillover" artifact of the resample boundary."""
    monthly = hourly.resample("ME").mean()
    return monthly.iloc[:3].max()


def build_spatial_field(
    receptor_points: np.ndarray,
    receptor_values: pd.Series,
    grid_x: np.ndarray,
    grid_y: np.ndarray,
    *,
    interp_method: str = "cubic",
    smoothing_sigma: float | None,
    calibration_target_max: float | None,
) -> np.ndarray:
    """Interpolate -> (optional) smooth -> (optional) calibrate. Every
    final map in the notebook follows this shape; which steps are skipped
    (1-hour CO2 skips both smoothing and calibration) is the caller's
    decision via the None args, driven by config.py's per-window tables."""
    field = griddata(receptor_points, receptor_values, (grid_x, grid_y), method=interp_method, fill_value=0)
    field = np.nan_to_num(field, nan=0.0)
    field = np.maximum(field, 0)

    if smoothing_sigma is not None:
        field = gaussian_filter(field, sigma=smoothing_sigma)

    if calibration_target_max is not None:
        raw_max = field.max()
        if raw_max > 0:
            field = field * (calibration_target_max / raw_max)

    return field


def field_to_geojson(grid_x: np.ndarray, grid_y: np.ndarray, field: np.ndarray, levels: list[float] | None = None) -> dict:
    """Converts a calibrated UTM-gridded field into a lon/lat GeoJSON
    FeatureCollection of filled contour bands - the step the notebook never
    did (it only ever rendered matplotlib contourf to screen)."""
    transformer = Transformer.from_crs(UTM_EPSG, WGS84_EPSG, always_xy=True)
    lon, lat = transformer.transform(grid_x, grid_y)

    if levels is None:
        # Same class of bug the CO2_1HR_CONTOUR_LEVELS comment below
        # documents, but at the opposite end: capping the top band at the
        # 99th percentile (done so one extreme source cell doesn't wash out
        # the whole color ramp) leaves every pixel ABOVE that percentile
        # outside all contourf bands. With extend="neither" (the default,
        # and the only mode confirmed cheap - see the extend="both" story
        # below) those pixels render as a transparent hole straight through
        # the fill, and because the field is sharply peaked right at each
        # source, that's exactly where the holes show up: punched into the
        # brightest part of every plume core, not out at the edges.
        # Fixed by adding one extra top band from the 99th percentile up to
        # the field's true max, so the compressed color ramp is preserved
        # for everything below it but the peak itself is still covered by
        # an ordinary band instead of sitting outside every level.
        field_max = float(np.nanmax(field))
        if field_max <= 0:
            levels = list(np.linspace(0, 1.0, 12))
        else:
            max_display = float(np.nanpercentile(field, 99)) or field_max
            levels = list(np.linspace(0, max_display, 11))
            if levels[-1] < field_max:
                levels.append(field_max)

    fig, ax = plt.subplots()
    try:
        # NOT extend="both": tried that first to close the 1hr window's
        # transparent gaps, but it backfired badly. extend folds the entire
        # out-of-range area into one fill band; for 1hr's 250x250 grid
        # (CO2_1HR_GRID_POINTS), where most of the field sits below the
        # fixed 0.5 floor, that band covers almost the whole domain as one
        # huge, highly fragmented polygon - geojsoncontour's
        # contourf_to_geojson then has to trace/normalize that giant shape,
        # which made a request that used to take ~8-10 min grind past
        # Node's 20-minute fetch timeout instead (and produced far more
        # "invalid value encountered in divide" RuntimeWarnings than usual -
        # that warning fires on near-zero-length polygon edges, consistent
        # with a far noisier/heavier shape than before). The actual fix
        # belongs in config.py: give CO2_1HR_CONTOUR_LEVELS a 0 floor so
        # 0->0.5 is an ordinary contour band like any other - the same
        # shape of fix that already makes 8hr/24hr/monthly gap-free (their
        # auto-computed levels start at 0 via np.linspace above), without
        # invoking extend's much heavier edge case at all.
        contour_set = ax.contourf(lon, lat, field, levels=levels)
        geojson_str = geojsoncontour.contourf_to_geojson(
            contourf=contour_set,
            min_angle_deg=CONTOUR_MIN_ANGLE_DEG,
            fill_opacity_range=CONTOUR_FILL_OPACITY_RANGE,
        )
    finally:
        plt.close(fig)

    return json.loads(geojson_str)
