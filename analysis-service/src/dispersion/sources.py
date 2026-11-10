"""Emission source loading + subdivision - ports notebook cells 3, 6, 20."""

from __future__ import annotations

import pandas as pd

from src.config import SOURCE_COLUMNS, SOURCE_SUBDIVISION_RESOLUTION_M
from src.io_utils import require_columns


def prepare_sources(sources: pd.DataFrame) -> pd.DataFrame:
    """Cell 6: area + emission flux per source. Does not mutate input."""
    require_columns(sources, list(SOURCE_COLUMNS.values()), context="Emission source file")

    sources = sources.copy()
    sources["Source Area (m2)"] = sources[SOURCE_COLUMNS["x_length"]] * sources[SOURCE_COLUMNS["y_length"]]
    sources["Emission Flux (g/m2/s)"] = sources[SOURCE_COLUMNS["emission_rate"]] / sources["Source Area (m2)"]
    return sources


def expand_sources(sources: pd.DataFrame, resolution: int = SOURCE_SUBDIVISION_RESOLUTION_M) -> pd.DataFrame:
    """Cell 20: subdivide each area source into resolution x resolution
    sub-cells with equally distributed emission rate. Returns a flat
    dataframe of {X, Y, Q, Area, Release Height, Base Elevation} rows
    across all sources.

    The notebook (cell 25) repeats each source's Base Elevation by a
    hardcoded count (4) to match the expanded array length - that only
    worked because every source in their specific dataset happened to
    subdivide into exactly 2x2 cells. Subcell count actually varies per
    source (depends on each source's own XLength/YLength vs. the fixed
    resolution), so elevation is carried through per-cell here instead
    of repeated after the fact - same result when every source really
    does produce 4 subcells, correct in general otherwise."""
    cells: list[dict] = []

    for _, source in sources.iterrows():
        x_length = source[SOURCE_COLUMNS["x_length"]]
        y_length = source[SOURCE_COLUMNS["y_length"]]

        nx = max(1, int(x_length / resolution))
        ny = max(1, int(y_length / resolution))

        cell_width = x_length / nx
        cell_height = y_length / ny
        cell_q = source[SOURCE_COLUMNS["emission_rate"]] / (nx * ny)

        for i in range(nx):
            for j in range(ny):
                cells.append(
                    {
                        "X": source[SOURCE_COLUMNS["x"]] - x_length / 2 + (i + 0.5) * cell_width,
                        "Y": source[SOURCE_COLUMNS["y"]] - y_length / 2 + (j + 0.5) * cell_height,
                        "Q": cell_q,
                        "Area": cell_width * cell_height,
                        "Release Height": source[SOURCE_COLUMNS["release_height"]],
                        "Base Elevation": source[SOURCE_COLUMNS["base_elevation"]],
                    }
                )

    return pd.DataFrame(cells)
