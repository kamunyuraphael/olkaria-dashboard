"""Receptor grid construction - ports notebook cells 7, 22-23, 112."""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.interpolate import griddata

from src.config import (
    H2S_RECEPTOR_GRID_MARGIN_M,
    H2S_RECEPTOR_GRID_POINTS,
    MAIN_GRID_DOMAIN_SIZE_M,
    MAIN_GRID_POINTS,
    MAIN_GRID_RECEPTOR_HEIGHT_M,
    SOURCE_COLUMNS,
)


def build_main_grid(sources: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray, np.ndarray]:
    """Cell 7: 21x21 receptor grid (441 points) centered on the emission
    sources, 10km domain. Shared by CO2 and CH4. Returns (receptors_df,
    X_mesh, Y_mesh) - the mesh shapes are needed later to reshape flat
    concentration arrays back into a 2D field."""
    center_x = sources[SOURCE_COLUMNS["x"]].mean()
    center_y = sources[SOURCE_COLUMNS["y"]].mean()

    x = np.linspace(center_x - MAIN_GRID_DOMAIN_SIZE_M / 2, center_x + MAIN_GRID_DOMAIN_SIZE_M / 2, MAIN_GRID_POINTS)
    y = np.linspace(center_y - MAIN_GRID_DOMAIN_SIZE_M / 2, center_y + MAIN_GRID_DOMAIN_SIZE_M / 2, MAIN_GRID_POINTS)
    X, Y = np.meshgrid(x, y)

    receptors = pd.DataFrame({"X": X.flatten(), "Y": Y.flatten(), "Z": MAIN_GRID_RECEPTOR_HEIGHT_M})
    return receptors, X, Y


def build_h2s_grid(h2s_sources: pd.DataFrame) -> pd.DataFrame:
    """Cell 112: H2S gets its own wider 51x51 grid, sized to its own
    source extent + a fixed buffer, independent of the main grid."""
    x_min = h2s_sources[SOURCE_COLUMNS["x"]].min()
    x_max = h2s_sources[SOURCE_COLUMNS["x"]].max()
    y_min = h2s_sources[SOURCE_COLUMNS["y"]].min()
    y_max = h2s_sources[SOURCE_COLUMNS["y"]].max()

    center_x = (x_min + x_max) / 2
    center_y = (y_min + y_max) / 2
    domain_x = (x_max - x_min) + 2 * H2S_RECEPTOR_GRID_MARGIN_M
    domain_y = (y_max - y_min) + 2 * H2S_RECEPTOR_GRID_MARGIN_M

    hx = np.linspace(center_x - domain_x / 2, center_x + domain_x / 2, H2S_RECEPTOR_GRID_POINTS)
    hy = np.linspace(center_y - domain_y / 2, center_y + domain_y / 2, H2S_RECEPTOR_GRID_POINTS)
    HX, HY = np.meshgrid(hx, hy)

    return pd.DataFrame({"X": HX.flatten(), "Y": HY.flatten(), "Z": MAIN_GRID_RECEPTOR_HEIGHT_M})


def interpolate_terrain(sources: pd.DataFrame, receptors: pd.DataFrame) -> np.ndarray:
    """Cells 22-23: interpolate each source's Base Elevation to receptor
    locations, filling outside the interpolation hull with the mean."""
    terrain_points = np.column_stack((sources[SOURCE_COLUMNS["x"]], sources[SOURCE_COLUMNS["y"]]))
    terrain_values = sources[SOURCE_COLUMNS["base_elevation"]]

    elevation = griddata(terrain_points, terrain_values, (receptors["X"], receptors["Y"]), method="linear")
    return np.nan_to_num(elevation, nan=np.mean(terrain_values))
