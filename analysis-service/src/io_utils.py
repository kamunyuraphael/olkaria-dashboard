"""
Tabular file loading - mirrors the extension set server/src/middleware/
upload.middleware.ts already allows (CSV/TSV/XLSX/XLS). This is the layer
where a mislabeled or malformed file actually fails - see that middleware's
docstring for the three-layer validation reasoning this completes.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd


class UnreadableFileError(ValueError):
    """Raised when a file can't be parsed as tabular data - surfaces as a
    job failure (stage="failed", readable error) through the existing
    AnalysisJob failure path, not a 500."""


def load_tabular(path: str | Path) -> pd.DataFrame:
    path = Path(path)
    ext = path.suffix.lower()

    try:
        if ext == ".csv":
            return pd.read_csv(path)
        if ext == ".tsv":
            return pd.read_csv(path, sep="\t")
        if ext in (".xlsx", ".xls"):
            return pd.read_excel(path)
    except Exception as exc:  # noqa: BLE001 - deliberately broad, re-raised typed below
        raise UnreadableFileError(f"Could not parse {path.name} as {ext}: {exc}") from exc

    raise UnreadableFileError(f"Unsupported file extension '{ext}' for {path.name}")


def require_columns(df: pd.DataFrame, columns: list[str], *, context: str) -> None:
    missing = [c for c in columns if c not in df.columns]
    if missing:
        raise UnreadableFileError(
            f"{context}: missing required column(s) {missing}. "
            f"Found columns: {list(df.columns)}"
        )
