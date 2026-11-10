"""
Diurnal-vs-receptor (R1-R4) pipelines - ports cells 74-77 (CO2), 103-105
(CH4), 124-125 (H2S). Per the "receptors are gas-specific" decision, each
gas keeps its own methodology rather than being forced into one shared
definition - see config.py for the per-gas constants driving this.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.ndimage import gaussian_filter1d

from src.config import (
    CH4_DIURNAL_EVENT_DATE,
    CH4_DIURNAL_SMOOTHING_SIGMA,
    CH4_H2S_DIURNAL_RECEPTOR_INDICES,
    CO2_DIURNAL_CYCLIC_SHIFT_HOURS,
    CO2_DIURNAL_RECEPTOR_COUNT,
    H2S_DIURNAL_SMOOTHING_SIGMA,
)


def _normalize(series: np.ndarray) -> np.ndarray:
    series = np.asarray(series, dtype=float)
    span = np.max(series) - np.min(series)
    if span == 0:
        return np.zeros_like(series)
    return (series - np.min(series)) / span


def _to_points(hour: np.ndarray, concentration_norm: np.ndarray, wind_norm: np.ndarray) -> list[dict]:
    return [
        {"hour": int(h), "concentrationNorm": float(c), "windSpeedNorm": float(w)}
        for h, c, w in zip(hour, concentration_norm, wind_norm)
    ]


def co2_diurnal(met: pd.DataFrame, hourly_full: pd.DataFrame) -> dict[str, list[dict]]:
    """Cells 74-77: dynamic top-4 receptors by mean concentration over the
    WHOLE dataset, averaged by hour-of-day across the full period, then a
    -5h cyclic roll "to align with AERMOD output"."""
    met_hour_of_day = met["Datetime"].dt.hour.to_numpy()

    hourly_with_hour = hourly_full.copy()
    hourly_with_hour["Hour_of_day"] = met_hour_of_day
    diurnal = hourly_with_hour.groupby("Hour_of_day").mean()

    receptor_mean = diurnal.mean(axis=0)
    selected = receptor_mean.sort_values(ascending=False).head(CO2_DIURNAL_RECEPTOR_COUNT).index

    diurnal_shifted = diurnal.copy()
    for col in diurnal_shifted.columns:
        diurnal_shifted[col] = np.roll(diurnal_shifted[col].to_numpy(), CO2_DIURNAL_CYCLIC_SHIFT_HOURS)

    wind_diurnal = (
        met.assign(Hour_of_day=met["Datetime"].dt.hour)
        .groupby("Hour_of_day")["Wind Speed (m/s)"]
        .mean()
        .reindex(range(24))
    )
    wind_norm = _normalize(wind_diurnal.to_numpy())
    hours = np.arange(24)

    labels = ["R1", "R2", "R3", "R4"]
    result: dict[str, list[dict]] = {}
    for label, receptor in zip(labels, selected):
        concentration_norm = _normalize(diurnal_shifted[receptor].to_numpy())
        result[label] = _to_points(hours, concentration_norm, wind_norm)

    return result


def ch4_diurnal(met: pd.DataFrame, hourly_full: pd.DataFrame) -> dict[str, list[dict]]:
    """Cells 103-105: a single hardcoded event day, fixed receptor
    indices into the main 21x21 grid, gaussian_filter1d smoothing then
    per-receptor normalization (no cyclic shift)."""
    event_date = pd.Timestamp(CH4_DIURNAL_EVENT_DATE)
    event_mask = pd.to_datetime(met["Datetime"]).dt.date == event_date.date()

    event_df = pd.DataFrame()
    for label, idx in CH4_H2S_DIURNAL_RECEPTOR_INDICES.items():
        event_df[label] = hourly_full.iloc[:, idx].to_numpy()[event_mask.to_numpy()]

    event_df["Wind Speed"] = met.loc[event_mask, "Wind Speed (m/s)"].to_numpy()
    hours = pd.to_datetime(met.loc[event_mask, "Datetime"]).dt.hour.to_numpy()

    wind_norm = event_df["Wind Speed"].to_numpy() / event_df["Wind Speed"].max()

    result: dict[str, list[dict]] = {}
    for label in CH4_H2S_DIURNAL_RECEPTOR_INDICES:
        smoothed = gaussian_filter1d(event_df[label].to_numpy(), sigma=CH4_DIURNAL_SMOOTHING_SIGMA)
        concentration_norm = smoothed / smoothed.max()
        result[label] = _to_points(hours, concentration_norm, wind_norm)

    return result


def h2s_diurnal(
    met: pd.DataFrame,
    main_grid_X: np.ndarray,
    main_grid_Y: np.ndarray,
    h2s_expanded_sources: pd.DataFrame,
) -> dict[str, list[dict]]:
    """Cells 124-125: reuses CH4's hardcoded indices but as coordinates
    into the MAIN grid's flattened X/Y (not h2s_receptors) - almost
    certainly different physical points than CH4's R1-R4 despite sharing
    index numbers; kept as-is per the gas-specific-receptors decision.
    Event day is dynamic: the day containing H2S's own peak hour."""
    from src.dispersion.physics import calc_hourly_full

    rec_x = np.array([main_grid_X.flatten()[i] for i in CH4_H2S_DIURNAL_RECEPTOR_INDICES.values()])
    rec_y = np.array([main_grid_Y.flatten()[i] for i in CH4_H2S_DIURNAL_RECEPTOR_INDICES.values()])

    source_X = h2s_expanded_sources["X"].to_numpy()
    source_Y = h2s_expanded_sources["Y"].to_numpy()
    source_Q = h2s_expanded_sources["Q"].to_numpy()
    source_height = h2s_expanded_sources["Release Height"].to_numpy()

    rec_hourly = np.array(
        [
            calc_hourly_full(
                rec_x, rec_y, source_X, source_Y, source_Q, source_height,
                row["Wind Speed (m/s)"], row["Wind Direction (°)"],
                row["Friction Velocity (m/s)"], row["Mixing Height (m)"], row["Monin Obukhov Length (m)"],
            )
            for _, row in met.iterrows()
        ]
    )

    peak_row = int(np.unravel_index(np.argmax(rec_hourly), rec_hourly.shape)[0])
    event_date = pd.to_datetime(met["Datetime"].iloc[peak_row]).normalize()
    event_mask = (pd.to_datetime(met["Datetime"]).dt.date == event_date.date()).to_numpy()

    labels = list(CH4_H2S_DIURNAL_RECEPTOR_INDICES.keys())
    wind_speed = met.loc[event_mask, "Wind Speed (m/s)"].to_numpy()
    wind_norm = wind_speed / wind_speed.max()
    hours = pd.to_datetime(met.loc[event_mask, "Datetime"]).dt.hour.to_numpy()

    result: dict[str, list[dict]] = {}
    for i, label in enumerate(labels):
        smoothed = gaussian_filter1d(rec_hourly[event_mask, i], sigma=H2S_DIURNAL_SMOOTHING_SIGMA)
        concentration_norm = smoothed / smoothed.max()
        result[label] = _to_points(hours, concentration_norm, wind_norm)

    return result
