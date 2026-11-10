"""
Gaussian-plume dispersion engines - verbatim ports of the notebook's three
engines that actually feed a final output (a fourth, calculate_hourly_aermod
_highres from cell 39, was only ever used for a one-off demo figure and
isn't part of any of the 15 final outputs, so it's deliberately not ported).

Per the project decision, these are kept as three DISTINCT engines rather
than unified into one, because the analysis team's notebook applies them
inconsistently across gases/windows and the goal is reproducing their
actual output, not correcting it. See dispersion/pipeline.py for which
engine each (gas, window) pair uses.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def sigma_y_aermod(x: np.ndarray, friction_velocity: float, monin_obukhov_length: float) -> np.ndarray:
    """Cell 12: horizontal dispersion coefficient."""
    x = np.where(np.asarray(x) <= 0, np.nan, x)
    stability_factor = 1 + np.abs(monin_obukhov_length) / 1000
    return 0.22 * x**0.90 * stability_factor ** (-0.20)


def sigma_z_aermod(x: np.ndarray, mixing_height: float, monin_obukhov_length: float) -> np.ndarray:
    """Cell 12: vertical dispersion coefficient, capped by mixing height."""
    x = np.where(np.asarray(x) <= 0, np.nan, x)
    stability_factor = 1 + np.abs(monin_obukhov_length) / 1000
    sigma_z = 0.14 * x**0.80 * stability_factor ** (-0.20)
    return np.minimum(sigma_z, mixing_height * 0.35)


def calc_hourly_full(
    receptor_X: np.ndarray,
    receptor_Y: np.ndarray,
    source_X: np.ndarray,
    source_Y: np.ndarray,
    source_Q: np.ndarray,
    source_height: np.ndarray,
    wind_speed: float,
    wind_direction: float,
    friction_velocity: float,
    mixing_height: float,
    monin_obukhov_length: float,
    receptor_height: float = 2,
) -> np.ndarray:
    """Engine #1 - cell 13's calculate_hourly_aermod. Full physics: wind-
    coordinate transform, both horizontal and vertical Gaussian dispersion
    terms, converts g/m3 -> ug/m3. Used by CH4 and H2S for every window and
    by CO2's diurnal chart and monthly map."""
    dx = receptor_X[:, None] - source_X[None, :]
    dy = receptor_Y[:, None] - source_Y[None, :]

    theta = np.radians(wind_direction)
    x = -dx * np.sin(theta) - dy * np.cos(theta)
    y = dx * np.cos(theta) - dy * np.sin(theta)
    x = np.where(x <= 1, np.nan, x)

    sy = np.maximum(sigma_y_aermod(x, friction_velocity, monin_obukhov_length), 1)
    sz = np.maximum(sigma_z_aermod(x, mixing_height, monin_obukhov_length), 1)

    concentration = (
        source_Q[None, :]
        / (2 * np.pi * wind_speed * sy * sz)
        * np.exp(-(y**2) / (2 * sy**2))
        * np.exp(-((receptor_height - source_height[None, :]) ** 2) / (2 * sz**2))
    )

    total = np.nansum(concentration, axis=1)
    return total * 1e6  # g/m3 -> ug/m3


def calc_hourly_terrain(
    receptor_X: np.ndarray,
    receptor_Y: np.ndarray,
    receptor_terrain_elevation: np.ndarray,
    source_X: np.ndarray,
    source_Y: np.ndarray,
    source_Q: np.ndarray,
    source_height: np.ndarray,
    source_elevation: np.ndarray,
    wind_speed: float,
    wind_direction: float,
    friction_velocity: float,
    mixing_height: float,
    monin_obukhov_length: float,
    receptor_height: float = 2,
) -> np.ndarray:
    """Engine #2 - cell 26's calculate_hourly_aermod_terrain. Same as the
    full engine but the vertical term uses terrain-corrected effective
    height difference instead of a flat receptor height. Only used for
    CO2's 1-hour map (cells 35-36)."""
    dx = receptor_X[:, None] - source_X[None, :]
    dy = receptor_Y[:, None] - source_Y[None, :]

    theta = np.radians(wind_direction + 180)
    x = dx * np.cos(theta) + dy * np.sin(theta)
    y = -dx * np.sin(theta) + dy * np.cos(theta)
    x = np.where(x <= 0, np.nan, x)

    sy = sigma_y_aermod(x, friction_velocity, monin_obukhov_length)
    sz = sigma_z_aermod(x, mixing_height, monin_obukhov_length)

    effective_height_difference = (source_elevation[None, :] + source_height[None, :]) - (
        receptor_terrain_elevation[:, None] + receptor_height
    )

    concentration = (
        source_Q[None, :]
        / (2 * np.pi * wind_speed * sy * sz)
        * np.exp(-(y**2) / (2 * sy**2))
        * np.exp(-(effective_height_difference**2) / (2 * sz**2))
    )

    total = np.nansum(concentration, axis=1)
    return total * 1e6  # g/m3 -> ug/m3


def calc_hourly_simple(
    receptors: pd.DataFrame,
    sources: pd.DataFrame,
    wind_speed: float,
    wind_direction: float,
    friction_velocity: float,
    mixing_height: float,
    monin_obukhov_length: float,
) -> np.ndarray:
    """Engine #4 - cell 53's calculate_aermod_concentration. Deliberately
    reproduces the notebook's incomplete formula: NO vertical dispersion
    exponential term (sz only appears in the denominator) and NO g/m3 ->
    ug/m3 unit conversion. Drives CO2's 8-hour and 24-hour maps (cells
    57-66) - kept exactly as-is per the "match the analysis team's actual
    output" decision, not corrected to match engine #1."""
    wind_rad = np.deg2rad(wind_direction)

    rx = receptors["X"].to_numpy()
    ry = receptors["Y"].to_numpy()
    concentration = np.zeros(len(receptors))

    for _, src in sources.iterrows():
        dx = rx - src["X"]
        dy = ry - src["Y"]

        x = dx * np.cos(wind_rad) + dy * np.sin(wind_rad)
        y = -dx * np.sin(wind_rad) + dy * np.cos(wind_rad)

        valid = x > 0
        if not np.any(valid):
            continue

        sy = sigma_y_aermod(x[valid], friction_velocity, monin_obukhov_length)
        sz = sigma_z_aermod(x[valid], mixing_height, monin_obukhov_length)
        Q = src["Q"]

        plume = (Q / (2 * np.pi * wind_speed * sy * sz)) * np.exp(-0.5 * (y[valid] / sy) ** 2)
        concentration[valid] += plume

    return concentration
